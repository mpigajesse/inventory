# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**NAOSERVICES INVENTORY** — Application PWA de gestion de stock et de ventes, développée conjointement par **MPJ HIGH-TECH** et **Naoservices** pour le compte d'un **client X** (commerçant détaillant, Libreville, Gabon, +241 07 40 13 02).

- Interface en **français**
- Monnaie : **FCFA**
- Cible : téléphones, tablettes, ordinateurs (responsive)
- Lecteur code-barres USB branché comme clavier (plug & play, sans pilote)

## Structure du projet

```
inventory/
├── frontend/   ← React 18 + Vite (interface utilisateur)
├── backend/    ← Django REST API (Supabase PostgreSQL)
└── tunnel/     ← Cloudflare Workers + cloudflared (accès distant)
```

## Commands Frontend

```bash
cd inventory/frontend

npm run dev          # Dev server sur le port 8080
npm run build        # Build production
npm run lint         # ESLint
npm run test         # Vitest (run unique)
npm run test:watch   # Vitest (watch)
npm run preview      # Preview du build prod
```

Lancer un seul fichier de test :
```bash
npx vitest run src/path/to/file.test.ts
```

## Stack

- **Vite** + **React 18** + **TypeScript** (`strict: false`, `noImplicitAny: false`)
- **shadcn/ui** (composants Radix UI) dans `src/components/ui/`
- **Tailwind CSS** — tous les tokens de design sont des CSS custom properties dans `src/index.css`
- **Zustand** — état global léger (`src/stores/notificationStore.ts`)
- **react-router-dom v6** — routing avec lazy loading
- **react-hook-form** + **zod** — formulaires
- **Vitest** + **Testing Library** — tests (environnement jsdom)

## Commands Backend

```bash
cd inventory/backend
D:\Inventory\env\Scripts\python manage.py runserver   # API sur le port 8000
D:\Inventory\env\Scripts\python manage.py migrate     # Appliquer les migrations
D:\Inventory\env\Scripts\python manage.py makemigrations
D:\Inventory\env\Scripts\python manage.py check
```

## État actuel (V1 en cours)

**Frontend** : connecté au backend réel via `src/services/` (axios, JWT).
**Backend** : Django REST API complet (9 apps), migrations appliquées sur Supabase.
**Accès distant** : Cloudflare Workers stables + tunnels cloudflared éphémères (voir `tunnel/`).

APIs disponibles :
- Authentification JWT (login/logout/me/change-password)
- Dashboard KPIs (`/api/dashboard/`)
- Produits + Catégories (CRUD + recherche barcode)
- Stock (consultation, alertes, ajustements)
- **POS/Caisse** — vente atomique avec décrémentation stock automatique
- Factures (auto-générées à chaque vente)
- Clients, Fournisseurs, Commandes fournisseurs
- Utilisateurs (rôles admin/vendeur, UserProfile avec `genre` M/F)
- Notifications, Journal d'activité

## Priorités de développement V1 (dans l'ordre du cahier des charges)

1. **Scanner + vente** — POS fonctionnel en UI, à connecter au vrai stock
2. **Mise à jour automatique du stock** — décrémenter stock après chaque vente
3. **Facturation** — génération PDF + impression (numéro, date, articles, total, monnaie rendue)
4. **Gestion des produits avec images** — upload via Cloudinary
5. **Accès à distance** — tunnel Cloudflare opérationnel

## Architecture Frontend

### Routing (`src/App.tsx`)

Toutes les pages sont lazy-loadées via `React.lazy`. Deux groupes :
- **Public** : `/auth/login`, `/auth/register`
- **Admin** (dans `AppLayout`) : `/dashboard`, `/products`, `/stock`, `/pos`, `/invoices`, `/clients`, `/users`, `/reports`, `/settings`, `/admin/*`
- **Vendeur** (dans `VendeurLayout`) : `/vendeur/dashboard`, `/vendeur/pos`

### Dual Layout selon le rôle

Il existe deux layouts distincts selon le rôle de l'utilisateur connecté :

| Layout | Composants | Routes |
|--------|-----------|--------|
| `AppLayout` | `AppSidebar` + `Topbar` | Toutes les routes admin |
| `VendeurLayout` | `VendeurSidebar` + `AdminActivityToast` | Routes `/vendeur/*` |

`AppLayout` et `VendeurLayout` lisent `currentUser.role` depuis `AuthContext` pour décider quel layout afficher. Le nom de caisse affiché dans la sidebar est dynamique : **CAISSE PRINCIPALE** pour l'admin, **CAISSE 01/02/…** pour les vendeur·ses (basé sur l'ID utilisateur).

### Client HTTP (`src/lib/api.ts`)

Toute communication avec le backend passe par l'instance axios centralisée `api` :
- Attache automatiquement le JWT depuis `localStorage` à chaque requête
- Gère le refresh automatique sur 401 (appel `/auth/token/refresh/`, retry de la requête originale)
- Redirige vers `/auth/login` si le refresh échoue

**Ne jamais créer une nouvelle instance axios.** Utiliser toujours `api` de `@/lib/api`.

### Services (`src/services/`)

Un service par domaine métier, chacun utilise `api` de `@/lib/api` :
`authService`, `productService`, `stockService`, `salesService`, `invoiceService`, `clientService`, `supplierService`, `dashboardService`, `notificationService`, `userService`, `activityService`, `statisticsService`

### Gestion des droits (`src/hooks/usePermissions.ts`)

Le hook `usePermissions()` expose `can(permission)` :
- **admin** : toutes les permissions automatiquement
- **vendeur** : permissions granulaires stockées dans `currentUser.permissions` (provenant du profil backend)

Permissions disponibles : `manage_users`, `manage_products`, `manage_stock`, `view_reports`, `manage_settings`, `manage_suppliers`, `view_barcodes`, `make_sales`, `view_invoices`, `manage_clients`

### Contextes

- `AuthContext` — utilisateur courant, login/logout, isLoading. Le `User` front inclut `genre: 'M' | 'F' | null` pour l'écriture inclusive dans les labels de rôle.
- `ThemeContext` — thème clair/sombre
- `SidebarContext` — état collapsed de la sidebar

### État global (`src/stores/`)

- `notificationStore` (Zustand) — compteur de notifications non lues partagé entre `Topbar` et `NotificationsPage`

### Layout et CSS

- `AppLayout` — flex wrapper : sidebar fixe (240px, collapsible 60px) + zone principale
- `AppSidebar` — sidebar sombre avec état collapsed, active-link highlight via CSS vars
- `Topbar` — header par page avec `title` + `subtitle` optionnel

Classes utilitaires dans `@layer components` (`src/index.css`) :
- `.page-container` — padding + max-width 1600px centré
- `.stat-card` — carte KPI avec border + hover shadow
- `.data-table` — tableau avec header grisé, hover sur lignes
- `.animate-slide-in` — animation d'entrée de page

Composants UI custom au-delà de shadcn :
- `StatCard` — carte KPI avec label, valeur, tendance, icône Lucide optionnelle
- `StatusBadge` — pill `success | warning | danger | info | default`

### Tokens de design

Tous les tokens (couleurs, sidebar, topbar, table, badges) sont des CSS custom properties dans `src/index.css`. Tailwind les mappe via `tailwind.config.ts`. **Toujours utiliser les tokens sémantiques** (`text-success`, `hsl(var(--sidebar-bg))`, `bg-primary/10`) — ne jamais hardcoder de couleurs.

### POS et scanner code-barres (`src/pages/PosPage.tsx`)

Le POS intercepte les événements `keydown` globaux pour les scanners USB (qui se comportent comme un clavier). Un buffer de 100ms + `Enter` valide le code. **Ne pas ajouter d'autres listeners `keydown` globaux qui pourraient interférer.**

### Alias de chemin

`@/` est résolu vers `src/` dans tout le projet.

## Architecture Backend

9 apps Django dans `inventory/backend/` :
`products`, `stock`, `sales`, `invoices`, `clients`, `suppliers`, `users`, `notifications`, `activity`

Config centralisée dans `config/` : `settings.py`, `urls.py`, `dashboard.py`.

Dépendances clés : `djangorestframework`, `simplejwt`, `cloudinary`, `django-cors-headers`, `psycopg2-binary` (Supabase).

## Tunnel / Accès distant (`inventory/tunnel/`)

Architecture à deux niveaux :
1. **Cloudflare Workers stables** (URLs permanentes) — proxifient vers des tunnels éphémères
2. **Tunnels cloudflared éphémères** (`*.trycloudflare.com`) — exposent les serveurs locaux

Lancer les tunnels : `tunnel/Launch-Tunnels.ps1` (PowerShell).
Les URLs actives des tunnels éphémères sont dans `tunnel/current-urls.txt`.

## Rôles utilisateurs

| Rôle | Accès | Label sidebar |
|------|-------|--------------|
| `admin` | Accès complet | CAISSE PRINCIPALE |
| `vendeur` | POS, factures, clients + permissions granulaires | CAISSE 01/02/… |

Le champ `genre` (`M`/`F`/`null`) sur le profil utilisateur permet l'écriture inclusive dans les labels (Vendeur / Vendeuse / Vendeur·se si non précisé).

## Modules V2 (ne pas implémenter en V1)

- Statistiques avancées
- Impression intégrée des codes-barres
- Mode hors ligne (cache service worker avancé)
- Suivi des dettes/crédits clients
