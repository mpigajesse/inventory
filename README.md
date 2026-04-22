# NAOSERVICES INVENTORY

> Application PWA de gestion de stock et de ventes pour commerce de détail.

Développée conjointement par **MPJ HIGH-TECH** et **Naoservices** pour un commerçant détaillant basé à **Libreville, Gabon**.

---

## Aperçu

Solution complète de point de vente et de gestion d'inventaire :

- **Interface** : français
- **Monnaie** : FCFA
- **Cibles** : téléphones, tablettes, ordinateurs (responsive, PWA)
- **Matériel** : lecteur code-barres USB (plug & play, sans pilote)
- **Rôles** : administrateur (accès complet) + vendeur·ses (POS + permissions granulaires)

---

## Fonctionnalités principales

- Authentification JWT avec rôles (admin / vendeur)
- Dashboard KPIs temps réel
- Gestion produits + catégories (avec images via Cloudinary)
- Stock : consultation, alertes seuil bas, ajustements
- **POS / Caisse** : scan code-barres, vente atomique, décrémentation stock automatique
- Facturation automatique (PDF + impression)
- Clients, fournisseurs, commandes fournisseurs
- Journal d'activité et notifications
- Monitoring des vendeur·ses en direct
- Accès distant sécurisé via tunnel Cloudflare

---

## Stack technique

### Frontend (`inventory/frontend/`)

- **Vite** + **React 18** + **TypeScript**
- **shadcn/ui** (Radix UI) + **Tailwind CSS** (design tokens CSS custom properties)
- **Zustand** pour l'état global léger
- **react-router-dom v6** avec lazy loading
- **react-hook-form** + **zod** pour les formulaires
- **Vitest** + **Testing Library** pour les tests

### Backend (`inventory/backend/`)

- **Django REST Framework** (9 apps métier)
- **PostgreSQL** hébergé sur **Supabase**
- **JWT** (SimpleJWT) pour l'authentification
- **Cloudinary** pour le stockage des images produits

### Accès distant (`inventory/tunnel/`)

- **Cloudflare Workers** (URLs stables)
- **cloudflared** (tunnels éphémères vers les serveurs locaux)

---

## Structure du projet

```
inventory/
├── frontend/   ← React 18 + Vite (interface utilisateur)
├── backend/    ← Django REST API (Supabase PostgreSQL)
└── tunnel/     ← Cloudflare Workers + cloudflared
```

---

## Installation

### Prérequis

- Node.js 18+
- Python 3.11+
- Compte Supabase (PostgreSQL)
- Compte Cloudinary
- Un fichier `.env` dans `inventory/backend/` (voir `.env.example`)

### Frontend

```bash
cd inventory/frontend
npm install
npm run dev          # Dev server sur http://localhost:8080
```

Autres commandes :

```bash
npm run build        # Build production
npm run lint         # ESLint
npm run test         # Vitest (run unique)
npm run test:watch   # Vitest (watch)
npm run preview      # Preview du build prod
```

### Backend

```bash
cd inventory/backend
D:\Inventory\env\Scripts\python manage.py migrate
D:\Inventory\env\Scripts\python manage.py runserver   # API sur http://localhost:8000
```

### Tunnel (accès distant)

```powershell
./inventory/tunnel/Launch-Tunnels.ps1
```

Les URLs éphémères sont écrites dans `inventory/tunnel/current-urls.txt`.

---

## Rôles utilisateurs

| Rôle | Accès | Label sidebar |
|------|-------|---------------|
| `admin` | Accès complet | CAISSE PRINCIPALE |
| `vendeur` | POS, factures, clients + permissions granulaires | CAISSE 01/02/… |

Le champ `genre` (M / F / null) sur le profil utilisateur permet l'écriture inclusive dans les labels (Vendeur / Vendeuse / Vendeur·se).

### Permissions granulaires (vendeurs)

`manage_users`, `manage_products`, `manage_stock`, `view_reports`, `manage_settings`, `manage_suppliers`, `view_barcodes`, `make_sales`, `view_invoices`, `manage_clients`

---

## API Backend

Principaux endpoints disponibles :

- `POST /api/auth/login/` — authentification
- `POST /api/auth/token/refresh/` — refresh JWT
- `GET /api/dashboard/` — KPIs
- `GET|POST /api/products/` — produits
- `GET /api/products/barcode/{code}/` — recherche par code-barres
- `GET /api/stock/` — stock + alertes
- `POST /api/sales/` — vente atomique (crée facture + décrémente stock)
- `GET /api/invoices/` — factures
- `GET|POST /api/clients/` — clients
- `GET|POST /api/suppliers/` — fournisseurs
- `GET /api/notifications/` — notifications
- `GET /api/activity/` — journal d'activité

---

## Roadmap

### V1 (en cours)

1. Scanner + vente POS
2. Mise à jour automatique du stock
3. Facturation PDF + impression
4. Gestion des produits avec images (Cloudinary)
5. Accès à distance opérationnel

### V2 (à venir)

- Statistiques avancées
- Impression intégrée des codes-barres
- Mode hors ligne complet (service worker avancé)
- Suivi des dettes/crédits clients

---

## Licence

Propriétaire — MPJ HIGH-TECH × Naoservices. Tous droits réservés.

---

## Contact

- **MPJ HIGH-TECH** — développement & architecture
- **Naoservices** — intégration & support
