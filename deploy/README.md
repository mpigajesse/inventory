# Déploiement — NAOSERVICES INVENTORY

Deux environnements, **un seul code**. Le backend est piloté par variables
d'environnement : on ne change jamais le code, seulement le `.env`.

| Environnement | Base de données | Serveur | Où |
|---------------|-----------------|---------|-----|
| **Local (dev)** | PostgreSQL local (pgAdmin) | `runserver` | Ton PC |
| **Prod (VM)** | PostgreSQL conteneur | gunicorn + Docker | VM Daytona |

Le **frontend** est déployé séparément sur **Cloudflare Pages** et pointe vers
l'API via `VITE_API_URL`.

---

## 1. Mode LOCAL — PostgreSQL via pgAdmin (sur ton PC)

PostgreSQL 18 est déjà installé (`C:\Program Files\PostgreSQL\18`).

### a) Créer la base dans pgAdmin

1. Ouvrir **pgAdmin** → se connecter au serveur local (mot de passe du user `postgres`).
2. Clic droit sur **Databases** → **Create** → **Database…**
3. **Database** : `inventory` — **Owner** : `postgres` → **Save**.

> Alternative en ligne de commande (même résultat) :
> ```powershell
> & "C:\Program Files\PostgreSQL\18\bin\createdb.exe" -U postgres inventory
> ```

### b) Pointer le backend vers cette base

Dans `inventory/backend/.env`, mettre :

```env
DATABASE_URL=postgres://postgres:TON_MOT_DE_PASSE@localhost:5432/inventory
SECRET_KEY=une-cle-secrete-locale
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:8080
# Cloudinary : garder tes clés existantes pour l'upload d'images
```

### c) Migrer + créer un admin + lancer

```powershell
cd D:\Inventory\inventory\backend
D:\Inventory\env\Scripts\python manage.py migrate
D:\Inventory\env\Scripts\python manage.py createsuperuser
D:\Inventory\env\Scripts\python manage.py runserver   # http://localhost:8000
```

Frontend (autre terminal) :
```powershell
cd D:\Inventory\inventory\frontend
npm run dev   # http://localhost:8080
```

---

## 2. Mode PROD — Docker sur la VM Daytona

Prérequis VM : Docker + arborescence `/srv/app` (voir `../DeployREADME.md`).

### a) Récupérer le code sur la VM

```bash
sudo mkdir -p /srv/app && cd /srv/app
git clone https://github.com/mpigajesse/inventory.git repo
# le compose vit dans repo/deploy
```

### b) Configurer le `.env` du compose

```bash
cd /srv/app/repo/deploy
cp .env.example .env
nano .env        # remplir POSTGRES_PASSWORD, SECRET_KEY, ALLOWED_HOSTS, CORS...
```

Générer une `SECRET_KEY` :
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### c) Lancer la stack

```bash
docker compose --env-file .env up -d --build
docker compose ps
docker compose logs -f backend
```

Au démarrage, le backend attend Postgres, applique les **migrations**, fait
`collectstatic`, puis lance gunicorn sur `:8000`.

Créer un superuser :
```bash
docker compose exec backend python manage.py createsuperuser
```

### d) Exposition publique — Cloudflare (VM Oracle Free Tier)

L'inbound direct Oracle (port 8000) étant capricieux (Security List / NSG),
l'API est exposée via une connexion **sortante** cloudflared, masquée derrière
un **Cloudflare Worker** qui fournit une URL HTTPS stable.

```
Navigateur
  └─ https://inventory-frontend-71j.pages.dev        (Cloudflare Pages — frontend)
        └─ VITE_API_URL
             └─ https://inventory-backend.mpj-dev.workers.dev   (Worker — URL API stable)
                   └─ TUNNEL_URL
                        └─ https://<xxxx>.trycloudflare.com      (quick tunnel, éphémère)
                              └─ cloudflared (service systemd sur la VM)
                                    └─ http://localhost:8000       (Django/gunicorn Docker)
```

**cloudflared en service permanent** (déjà installé) :
```bash
sudo systemctl status cloudflared-quick
sudo journalctl -u cloudflared-quick | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1
```

**Worker** (`inventory/tunnel/backend-proxy/`) : proxifie HTTPS → tunnel, gère le
CORS (autorise `*.pages.dev`). Déploiement/refresh depuis le PC :
```bash
cd inventory/tunnel/backend-proxy
# mettre à jour TUNNEL_URL dans wrangler.toml si le tunnel a changé, puis :
npx wrangler deploy
```

**Frontend Pages** — build + déploiement depuis le PC :
```bash
cd inventory/frontend
VITE_API_URL="https://inventory-backend.mpj-dev.workers.dev/api" npm run build
npx wrangler pages deploy dist --project-name inventory-frontend
```

---

## 2bis. Mises à jour en production

### Backend (VM Oracle) — après un `git push`
```bash
cd /srv/app/repo
sudo git pull
cd deploy
sudo docker compose --env-file .env up -d --build   # rebuild si le code backend a changé
# (sans --build si seul le .env a changé)
```

### Frontend (Cloudflare Pages) — depuis le PC
Rebuild + redeploy (voir §2d). L'URL `inventory-frontend-71j.pages.dev` reste stable.

### Si cloudflared redémarre (reboot VM) → l'URL trycloudflare change
```bash
# 1) Récupérer la nouvelle URL sur la VM
sudo journalctl -u cloudflared-quick | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1
# 2) La mettre dans inventory/tunnel/backend-proxy/wrangler.toml (TUNNEL_URL) sur le PC
# 3) Redéployer le Worker
cd inventory/tunnel/backend-proxy && npx wrangler deploy
```
> Le frontend n'a PAS besoin d'être rebuildé : il ne connaît que l'URL du Worker.

---

## 3. Sauvegardes DB (prod)

```bash
# Dump
docker compose exec -T db pg_dump -U inventory inventory \
  > /srv/app/backups/inventory_$(date +%F).sql

# Restauration
cat /srv/app/backups/inventory_2026-07-13.sql \
  | docker compose exec -T db psql -U inventory inventory
```

---

## Commandes utiles

| Besoin | Commande |
|--------|----------|
| Logs backend | `docker compose logs -f backend` |
| Redémarrer | `docker compose restart backend` |
| Migration manuelle | `docker compose exec backend python manage.py migrate` |
| Shell Django | `docker compose exec backend python manage.py shell` |
| Arrêt complet | `docker compose down` (les données restent dans `/srv/app/data`) |
