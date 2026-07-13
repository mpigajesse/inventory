#!/usr/bin/env bash
# ─── Démarrage du backend Django en conteneur ────────────────────────────────
# 1) attend que PostgreSQL réponde  2) migre  3) collecte les statiques
# 4) lance gunicorn. Fail-fast : toute erreur stoppe le conteneur.
set -euo pipefail

echo "→ Attente de PostgreSQL..."
python <<'PY'
import os, sys, time
import dj_database_url
import psycopg2

cfg = dj_database_url.parse(os.environ["DATABASE_URL"])
for attempt in range(30):
    try:
        psycopg2.connect(
            dbname=cfg["NAME"], user=cfg["USER"], password=cfg["PASSWORD"],
            host=cfg["HOST"], port=cfg["PORT"] or 5432,
        ).close()
        print("  PostgreSQL prêt.")
        sys.exit(0)
    except psycopg2.OperationalError:
        time.sleep(2)
print("  PostgreSQL injoignable après 60s.", file=sys.stderr)
sys.exit(1)
PY

echo "→ Migrations..."
python manage.py migrate --noinput

echo "→ Collecte des fichiers statiques..."
python manage.py collectstatic --noinput

echo "→ Lancement de gunicorn sur :8000"
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --access-logfile - \
    --error-logfile -
