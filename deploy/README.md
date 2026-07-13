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

### d) Frontend Cloudflare

Builder le frontend avec l'URL de l'API de la VM :
```
VITE_API_URL=https://<api-vm>/api
```
puis déployer `inventory/frontend/dist` sur **Cloudflare Pages**.
Reporter ce domaine Cloudflare dans `CORS_ALLOWED_ORIGINS` et
`CSRF_TRUSTED_ORIGINS` du `.env` prod, puis `docker compose up -d` à nouveau.

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
