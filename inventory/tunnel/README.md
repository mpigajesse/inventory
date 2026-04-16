# GAM Cloudflare Tunnel

Ce dossier contient la configuration pour exposer l'application GAM via des tunnels Cloudflare sécurisés.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            INTERNET                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKERS (Stables)                         │
│  ┌───────────────────────────┐    ┌───────────────────────────────────┐│
│  │ gam-tunnel-front          │    │ gam-tunnel-back                   ││
│  │ .geniesafriquemedia       │    │ .geniesafriquemedia               ││
│  │ .workers.dev              │    │ .workers.dev                      ││
│  │                           │    │                                   ││
│  │ /api/* → Backend Worker   │    │ Proxy vers Django                 ││
│  │ /* → Frontend Tunnel      │    │ CORS + Timeout étendu             ││
│  └───────────────────────────┘    └───────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    TUNNELS ÉPHÉMÈRES (cloudflared)                      │
│  ┌───────────────────────────┐    ┌───────────────────────────────────┐│
│  │ *.trycloudflare.com       │    │ *.trycloudflare.com               ││
│  │ (Frontend)                │    │ (Backend)                         ││
│  └───────────────────────────┘    └───────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         SERVEURS LOCAUX                                 │
│  ┌───────────────────────────┐    ┌───────────────────────────────────┐│
│  │ Next.js (port 3000)       │    │ Django (port 8000)                ││
│  │ npm run dev               │    │ python manage.py runserver        ││
│  └───────────────────────────┘    └───────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

## Compte Cloudflare

- **Email**: Geniesafriquemedia@gmail.com
- **Workers**:
  - Frontend: `https://gam-tunnel-front.geniesafriquemedia.workers.dev`
  - Backend: `https://gam-tunnel-back.geniesafriquemedia.workers.dev`

## Prérequis

1. **cloudflared** installé ([Installation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/))
2. **wrangler** installé (`npm install -g wrangler`)
3. **Connexion wrangler** (`wrangler login` avec le compte Geniesafriquemedia@gmail.com)

## Utilisation

### 1. Démarrer les serveurs locaux

```bash
# Terminal 1 - Backend Django
cd GAM-backend
python manage.py runserver

# Terminal 2 - Frontend Next.js
cd GAM-frontend
npm run dev
```

### 2. Lancer les tunnels

```powershell
# Depuis le dossier racine GAM-full
powershell -ExecutionPolicy Bypass -File tunnel\Launch-Tunnels.ps1
```

Le script va:
1. Lancer deux tunnels cloudflared (frontend port 3000, backend port 8000)
2. Extraire les URLs éphémères `*.trycloudflare.com`
3. Configurer les secrets dans les Workers Cloudflare
4. Déployer les Workers

### 3. Accéder à l'application

- **URL Stable**: https://gam-tunnel-front.geniesafriquemedia.workers.dev
- Les requêtes `/api/*` sont automatiquement routées vers le backend

## Configuration

### Variables d'environnement Frontend (pour mode tunnel)

Créez un fichier `.env.tunnel` dans `GAM-frontend/`:

```env
# Mode tunnel - utiliser le chemin relatif
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_MEDIA_URL=https://gam-tunnel-back.geniesafriquemedia.workers.dev
```

### Options du script

```powershell
# Ports personnalisés
.\Launch-Tunnels.ps1 -FrontendPort 3001 -BackendPort 8001

# Sans déploiement Workers (juste les tunnels)
.\Launch-Tunnels.ps1 -SkipDeploy
```

## Structure des fichiers

```
tunnel/
├── README.md                 # Cette documentation
├── Launch-Tunnels.ps1        # Script d'automatisation
├── current-urls.txt          # URLs actuelles (généré)
├── logs/                     # Logs des tunnels
│   ├── frontend-tunnel.log
│   └── backend-tunnel.log
├── frontend-proxy/
│   ├── index.ts              # Code du Worker Frontend
│   └── wrangler.toml         # Config Wrangler
└── backend-proxy/
    ├── index.ts              # Code du Worker Backend
    └── wrangler.toml         # Config Wrangler
```

## Dépannage

### Le tunnel ne démarre pas

```powershell
# Vérifier que cloudflared est installé
cloudflared --version

# Tuer les processus cloudflared existants
Get-Process cloudflared | Stop-Process -Force
```

### Erreur CORS

Vérifiez que les settings Django incluent:
- `CORS_ALLOWED_ORIGIN_REGEXES` avec `*.workers.dev` et `*.trycloudflare.com`
- `CSRF_TRUSTED_ORIGINS` avec les URLs des Workers

### Erreur 503 "Tunnel not available"

Le Worker n'a pas reçu l'URL du tunnel. Relancez le script `Launch-Tunnels.ps1`.

### Erreur wrangler "not logged in"

```bash
wrangler login
# Se connecter avec Geniesafriquemedia@gmail.com
```

## Notes

- Les tunnels éphémères changent à chaque redémarrage
- Les Workers Cloudflare restent stables et routent automatiquement
- Le script met à jour les secrets des Workers à chaque lancement