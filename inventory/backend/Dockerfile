# ─── NAOSERVICES INVENTORY — Backend Django (prod) ───────────────────────────
# Image légère, gunicorn + whitenoise. Les migrations et collectstatic sont
# lancés au démarrage par entrypoint.sh.
FROM python:3.12-slim

# Réglages Python : pas de .pyc, logs non bufferisés (visibles en direct)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dépendances système minimales.
# - libpq5 : runtime PostgreSQL pour psycopg2-binary
# - curl   : utilisé par le healthcheck du compose
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Installer les dépendances Python d'abord (cache Docker efficace)
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copier le code applicatif
COPY . .

# Utilisateur non-root + bit exécutable sur l'entrypoint (perdu depuis Windows)
RUN chmod +x entrypoint.sh \
    && useradd --create-home --uid 1000 appuser \
    && mkdir -p /app/staticfiles /app/media \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
