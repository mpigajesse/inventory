# 🚀 Playbook de déploiement — Django + React sur Oracle Free Tier + Cloudflare

> Guide **réutilisable** pour déployer une app (backend Django + BD PostgreSQL sur une
> VM Oracle, frontend React/Vite sur Cloudflare Pages, exposition HTTPS via Cloudflare
> Worker + cloudflared). Une VM Oracle par app. Testé et éprouvé sur NAOSERVICES INVENTORY.

**Convention** : remplace partout `<APP>` (ex: `inventory`), `<VM_IP>` (IP publique Oracle),
`<WORKER_URL>` (`https://<app>-backend.<sous-domaine>.workers.dev`), `<PAGES_URL>`
(`https://<app>-frontend-xxx.pages.dev`).

---

## 🗺️ Architecture cible

```
Navigateur
  └─ <PAGES_URL>                              Cloudflare Pages (frontend React)
        │  VITE_API_URL (figé au build)
        └─ <WORKER_URL>                       Cloudflare Worker (URL API stable, HTTPS)
              │  TUNNEL_URL
              └─ https://xxx.trycloudflare.com  quick tunnel (cloudflared, service systemd)
                    └─ http://localhost:8000     Django/gunicorn (Docker) + PostgreSQL (Docker)
                                                 sur la VM Oracle
```

**Pourquoi ce montage ?**
- Oracle Free Tier = IP publique fixe, mais l'**inbound** (ouvrir un port) est capricieux
  (Security List + NSG). Une connexion **sortante** cloudflared contourne tout ça.
- Le **Worker** donne une URL HTTPS **stable** (`.workers.dev`) qui masque le tunnel éphémère.
- Le **frontend** ne connaît que le Worker → il ne casse jamais, même si le tunnel change.

---

## ✅ Prérequis (une seule fois)

- Compte **Oracle Cloud** (Always Free) + compte **Cloudflare** (gratuit).
- Sur ton PC : **Node.js** (pour `wrangler`), **Git**, **Docker Desktop**, **Python + venv**.
- `wrangler` s'utilise via `npx wrangler ...` (pas besoin d'installer globalement).

---

# PARTIE 0 — Préparer l'app en local (dockerisation)

Ces fichiers rendent l'app « 12-factor » : tout se configure par variables d'environnement,
le même code tourne en local (PC + pgAdmin) et en prod (VM + Docker).

## 0.1 — `requirements.txt` : ajouter le serveur de prod

```
gunicorn==23.0.0
whitenoise==6.9.0
dj-database-url==3.1.2
psycopg2-binary==2.9.11
python-dotenv==1.2.2
pillow==12.2.0          # si upload d'images
# ... tes autres deps (Django, DRF, etc.)
```

## 0.2 — `config/settings.py` : config pilotée par l'environnement

```python
import os
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ['SECRET_KEY']
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = [h.strip() for h in os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]

# --- Reverse proxy (Cloudflare Worker → cloudflared) ---
# Le Worker envoie X-Forwarded-Host (son domaine .workers.dev) + X-Forwarded-Proto: https.
# Indispensable pour que build_absolute_uri() (image_url, etc.) sorte en HTTPS vers le Worker.
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',   # sert /static en prod (gunicorn)
    'corsheaders.middleware.CorsMiddleware',
    # ... reste du middleware
]

DATABASES = {
    'default': dj_database_url.parse(
        os.environ['DATABASE_URL'],
        conn_max_age=int(os.environ.get('DB_CONN_MAX_AGE', '0')),
    )
}

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = Path(os.environ.get('MEDIA_ROOT', BASE_DIR / 'media'))

CORS_ALLOWED_ORIGINS = [o.strip() for o in os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()]
CSRF_TRUSTED_ORIGINS = [o.strip() for o in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()]
```

> Sers les **médias** en prod (gunicorn, sans nginx) avec une route explicite dans `config/urls.py` :
> ```python
> from django.conf import settings
> from django.urls import re_path
> from django.views.static import serve
> urlpatterns += [ re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}) ]
> ```

## 0.3 — `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
RUN chmod +x entrypoint.sh \
    && useradd --create-home --uid 1000 appuser \
    && mkdir -p /app/staticfiles /app/media \
    && chown -R appuser:appuser /app
USER appuser
EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
```

## 0.4 — `backend/entrypoint.sh` (⚠️ fins de ligne **LF**, voir 0.7)

```bash
#!/usr/bin/env bash
set -euo pipefail
echo "→ Attente de PostgreSQL..."
python - <<'PY'
import os, sys, time, dj_database_url, psycopg2
cfg = dj_database_url.parse(os.environ["DATABASE_URL"])
for _ in range(30):
    try:
        psycopg2.connect(dbname=cfg["NAME"], user=cfg["USER"], password=cfg["PASSWORD"],
                         host=cfg["HOST"], port=cfg["PORT"] or 5432).close(); sys.exit(0)
    except psycopg2.OperationalError: time.sleep(2)
sys.exit("PostgreSQL injoignable")
PY
python manage.py migrate --noinput
python manage.py collectstatic --noinput
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 \
     --workers "${GUNICORN_WORKERS:-2}" --timeout 60 --access-logfile - --error-logfile -
```

## 0.5 — `backend/.dockerignore`

```
.env
.env.*
!.env.example
__pycache__/
*.py[cod]
staticfiles/
media/
.git/
*.log
```

## 0.6 — `deploy/docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ${DATA_DIR:-/srv/app/data}/postgres:/var/lib/postgresql/data:z   # :z = SELinux (Rocky)
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ../backend            # adapte le chemin vers ton backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      SECRET_KEY: ${SECRET_KEY}
      DEBUG: ${DEBUG:-False}
      ALLOWED_HOSTS: ${ALLOWED_HOSTS}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS}
      CSRF_TRUSTED_ORIGINS: ${CSRF_TRUSTED_ORIGINS}
      MEDIA_ROOT: /app/media
      GUNICORN_WORKERS: ${GUNICORN_WORKERS:-2}      # 2 pour une VM 1 Go RAM
    volumes:
      - ${DATA_DIR:-/srv/app/data}/uploads:/app/media:z
    ports:
      - "${BACKEND_PORT:-8000}:8000"
    healthcheck:
      test: ["CMD-SHELL", "curl -fsS http://localhost:8000/admin/login/ >/dev/null || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 40s
```

## 0.7 — `.gitattributes` (⚠️ CRITIQUE) et `.gitignore`

`.gitattributes` — sinon `entrypoint.sh` est commité en CRLF depuis Windows → shebang cassé
dans le conteneur Linux (`exec ./entrypoint.sh: no such file or directory`) :
```
*.sh text eol=lf
entrypoint.sh text eol=lf
* text=auto
```

`.gitignore` — ajouter :
```
.env
.env.local
backend/media/
backend/staticfiles/
```

## 0.8 — `deploy/.env.example`

```env
POSTGRES_DB=<app>
POSTGRES_USER=<app>
POSTGRES_PASSWORD=Choisis-Un-MotDePasse-Sans-Caracteres-URL   # ⚠️ voir note ci-dessous
SECRET_KEY=genere-avec-openssl-rand-base64-48
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,<VM_IP>,.trycloudflare.com,.workers.dev
CORS_ALLOWED_ORIGINS=<PAGES_URL>
CSRF_TRUSTED_ORIGINS=<PAGES_URL>,https://*.trycloudflare.com,https://*.workers.dev
DATA_DIR=/srv/app/data
BACKEND_PORT=8000
GUNICORN_WORKERS=2
```

> ⚠️ **`POSTGRES_PASSWORD` : bannir `@ $ : / # ? % &`**. Il transite dans `DATABASE_URL`
> (une URL) et dans le fichier `.env` (où `$` déclenche une interpolation Compose).
> Utilise lettres/chiffres + `- _ . !`. Ex : `MonApp-2026-Secret!`

---

# PARTIE 1 — Créer la VM Oracle

1. **Compute → Instances → Create Instance**.
2. Image : **Ubuntu 22.04** ou **Rocky Linux 9** (les deux OK ; Rocky = SELinux, d'où `:z`).
3. Shape : **VM.Standard.E2.1.Micro** (Always Free, 1 OCPU / 1 Go RAM).
4. Réseau : crée/associe un VCN avec **sous-réseau public** + clé SSH.
5. Note l'**IP publique** = `<VM_IP>`.

> ℹ️ Avec le montage cloudflared (sortant), **tu n'as PAS besoin d'ouvrir de port entrant**
> dans la Security List. Si un jour tu veux l'inbound direct : Security List → règle d'entrée
> **Stateful**, Source `0.0.0.0/0`, TCP, **port DESTINATION = 8000** (source vide).

---

# PARTIE 2 — Déployer le backend sur la VM

SSH sur la VM, puis :

```bash
# Docker (si absent) + git
sudo dnf install -y git    # Rocky   (ou: sudo apt install -y git   sur Ubuntu)
sudo systemctl enable --now docker

# Arborescence + DROITS (le conteneur écrit en uid 1000)
sudo mkdir -p /srv/app/data/postgres /srv/app/data/uploads
sudo chown -R 1000:1000 /srv/app/data/uploads     # ⚠️ sinon PermissionError sur /app/media

# Code
sudo git clone https://github.com/<user>/<APP>.git /srv/app/repo
cd /srv/app/repo/deploy
sudo cp .env.example .env
sudo nano .env         # remplir POSTGRES_PASSWORD, SECRET_KEY, ALLOWED_HOSTS(<VM_IP>)...

# SECRET_KEY :  openssl rand -base64 48

# Lancer
sudo docker compose --env-file .env up -d --build
sudo docker compose ps          # db (healthy) + backend (Up)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/admin/login/   # → 200

# Compte admin + données
sudo docker compose exec backend python manage.py createsuperuser
# (optionnel) sudo docker compose exec backend python manage.py seed_all
```

---

# PARTIE 3 — Exposer l'API en HTTPS (cloudflared + Worker)

## 3.1 — cloudflared en **service systemd** (permanent)

```bash
# Rocky/RHEL :
sudo dnf install -y https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm
# Ubuntu : télécharge le .deb équivalent depuis la même page releases

sudo tee /etc/systemd/system/cloudflared-quick.service >/dev/null <<'EOF'
[Unit]
Description=cloudflared quick tunnel -> Django :8000
After=network-online.target
Wants=network-online.target
[Service]
ExecStart=/usr/bin/cloudflared tunnel --no-autoupdate --url http://localhost:8000
Restart=always
RestartSec=5
User=root
[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-quick
sleep 8
# Récupère l'URL du tunnel :
sudo journalctl -u cloudflared-quick | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1
```

Note l'URL `https://xxx.trycloudflare.com` = `<TUNNEL_URL>`.

## 3.2 — Le Worker Cloudflare (URL API stable)

Crée `worker/index.ts` :
```ts
export interface Env { TUNNEL_URL: string }

function cors(req: Request): Record<string, string> {
  const o = req.headers.get('Origin') || '';
  const ok = o.endsWith('.pages.dev') || o.endsWith('.workers.dev') ||
             o === 'http://localhost:8080' || o === 'http://localhost:5173';
  return {
    'Access-Control-Allow-Origin': ok ? o : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const h = cors(request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(request.url);
    const target = new URL(url.pathname + url.search, env.TUNNEL_URL);
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', url.host);       // → image_url pointe vers le Worker
    headers.set('X-Forwarded-Proto', 'https');
    headers.delete('Host');
    const resp = await fetch(new Request(target.toString(), {
      method: request.method, headers, body: request.body, redirect: 'manual',
    }));
    const rh = new Headers(resp.headers);
    Object.entries(h).forEach(([k, v]) => rh.set(k, v));
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: rh });
  },
};
```

`worker/wrangler.toml` :
```toml
name = "<APP>-backend"
main = "index.ts"
compatibility_date = "2024-01-01"
account_id = "<TON_ACCOUNT_ID>"      # affiché par `npx wrangler whoami`
workers_dev = true

[vars]
TUNNEL_URL = "<TUNNEL_URL>"          # l'URL trycloudflare de l'étape 3.1
```

Déploie depuis le PC :
```bash
cd worker
npx wrangler login       # une fois (OAuth navigateur)
npx wrangler deploy      # → https://<APP>-backend.<sous-domaine>.workers.dev  = <WORKER_URL>
```

Teste : `curl -o /dev/null -w "%{http_code}\n" <WORKER_URL>/admin/login/` → **200**.

---

# PARTIE 4 — Déployer le frontend (Cloudflare Pages)

```bash
cd frontend
VITE_API_URL="<WORKER_URL>/api" npm run build

npx wrangler pages project create <APP>-frontend --production-branch main   # une fois
npx wrangler pages deploy dist --project-name <APP>-frontend --branch main --commit-dirty true
# → https://<APP>-frontend-xxx.pages.dev  = <PAGES_URL>
```

> Le suffixe aléatoire (`-xxx`) est **stable** et inévitable sans domaine perso.
> Le Worker autorise déjà toutes les origines `.pages.dev`, donc le CORS marche d'office.

**Boucle finale** : reporte `<PAGES_URL>` dans `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS`
du `.env` de la VM, puis `sudo docker compose --env-file .env up -d`.

---

# PARTIE 5 — Mises à jour en production

**Backend** (après un `git push`) :
```bash
cd /srv/app/repo && sudo git pull && cd deploy
sudo docker compose --env-file .env up -d --build      # --build si le code a changé
```

**Frontend** :
```bash
cd frontend
VITE_API_URL="<WORKER_URL>/api" npm run build
npx wrangler pages deploy dist --project-name <APP>-frontend
```

**Si la VM reboote** (l'URL trycloudflare change) :
```bash
# 1) nouvelle URL :
sudo journalctl -u cloudflared-quick | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1
# 2) maj TUNNEL_URL dans worker/wrangler.toml sur le PC, puis :
cd worker && npx wrangler deploy
# → le frontend n'a PAS besoin d'être rebuildé
```

---

# 🧰 Annexe — Tous les pièges rencontrés (et leur fix)

| Symptôme | Cause | Fix |
|----------|-------|-----|
| `exec ./entrypoint.sh: no such file or directory` | CRLF Windows dans le `.sh` | `.gitattributes` → `*.sh text eol=lf` |
| `PermissionError: /app/media/products` | Volume monté appartient à root, conteneur en uid 1000 | `sudo chown -R 1000:1000 /srv/app/data/uploads` |
| `permission denied` sur le volume Postgres (Rocky) | SELinux | suffixe `:z` sur les bind-mounts |
| DB password mangé / `DATABASE_URL` cassée | `$`/`@` dans le mot de passe | mot de passe sans `@ $ : / # ? % &` |
| `image_url` en `http://xxx.trycloudflare.com` | Django ignore X-Forwarded-* | `USE_X_FORWARDED_HOST=True` + `SECURE_PROXY_SSL_HEADER` + `.workers.dev` dans ALLOWED_HOSTS |
| `400 DisallowedHost` via tunnel | host tunnel absent d'ALLOWED_HOSTS | ajouter `.trycloudflare.com` (et `.workers.dev`) |
| CSRF admin cassé via HTTPS | origine absente | `CSRF_TRUSTED_ORIGINS` avec le domaine + wildcards |
| Port 8000 injoignable depuis Internet | Oracle Security List/NSG + FORWARD | ne pas ouvrir l'inbound → utiliser cloudflared (sortant) |
| `curl` timeout `HTTP 000` | pare-feu DROP (couche réseau) | vérifier depuis la VM ; un 4xx = réseau OK |
| OOM / lenteurs | 1 Go RAM | `GUNICORN_WORKERS=2`, swap actif |
| `wrangler deploy` échoue | `account_id` ≠ compte connecté | aligner `account_id` sur `npx wrangler whoami` |
| tunnel meurt à la fermeture SSH | process en avant-plan | service **systemd** (`cloudflared-quick`) |

---

## 📋 Checklist express par nouvelle app

- [ ] 0. Ajouter Dockerfile, entrypoint.sh, .dockerignore, compose, .env.example, .gitattributes, .gitignore, settings (env + X-Forwarded)
- [ ] 1. Créer VM Oracle E2.1.Micro + noter `<VM_IP>`
- [ ] 2. VM : docker, `mkdir /srv/app/data/*`, **chown uploads 1000**, clone, `.env`, `up -d --build`, superuser
- [ ] 3. cloudflared systemd → `<TUNNEL_URL>` ; Worker `wrangler.toml` + `wrangler deploy` → `<WORKER_URL>`
- [ ] 4. `VITE_API_URL=<WORKER_URL>/api npm run build` → `wrangler pages deploy` → `<PAGES_URL>`
- [ ] 5. Reporter `<PAGES_URL>` dans CORS/CSRF du `.env`, `up -d`
- [ ] ✅ Tester login + images via `<PAGES_URL>`

---
*Playbook dérivé du déploiement NAOSERVICES INVENTORY (Oracle Free Tier + Cloudflare).*
