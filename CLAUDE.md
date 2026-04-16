# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**NAOSERVICES INVENTORY** — Application PWA de gestion de stock et de ventes, développée conjointement par **MPJ HIGH-TECH** et **Naoservices** pour le compte d'un **client X** (commerçant détaillant, Libreville, Gabon, +241 07 40 13 02).

- Interface en **français**
- Monnaie : **FCFA**
- Cible : téléphones, tablettes, ordinateurs (responsive)
- Lecteur code-barres USB branché comme clavier (plug & play, sans pilote)

## App Location

Tout le code source est dans `inventory/app/`. Toutes les commandes ci-dessous se lancent depuis ce dossier.

## Commands

```bash
cd inventory/app

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
- **TanStack Query** — installé, non encore utilisé (prévu pour les appels API futurs)
- **react-router-dom v6** — routing avec lazy loading
- **react-hook-form** + **zod** — formulaires
- **Vitest** + **Testing Library** — tests (environnement jsdom)

## État actuel (V1 en cours)

**L'app est un prototype UI — toutes les données sont des tableaux mock hardcodés dans chaque page. Il n'y a pas de backend ni d'API.**

Ce qui est construit (UI uniquement) :
- Authentification : formulaires login/register sans logique réelle (le bouton "Se connecter" navigue directement vers `/dashboard`)
- Dashboard : KPIs, ventes récentes, alertes stock bas
- Produits : liste avec recherche par nom/code-barres
- Stock : tableau avec indicateurs de niveau (critique/bas/normal)
- **POS/Caisse** : le module le plus avancé — scanner code-barres fonctionnel, panier, calcul monnaie, modal paiement
- Factures : liste consultable, boutons Voir/Imprimer (non fonctionnels)
- Clients : fiches client avec historique d'achats
- Utilisateurs : gestion rôles admin/vendeur
- Rapports : graphe barre ventes/semaine, top produits
- Paramètres : config entreprise (nom, adresse, NIF)

## Priorités de développement V1 (dans l'ordre du cahier des charges)

1. **Scanner + vente** — POS déjà fonctionnel en UI, à connecter au vrai stock
2. **Mise à jour automatique du stock** — décrémenter stock après chaque vente
3. **Facturation** — génération PDF + impression (numéro, date, articles, total, monnaie rendue)
4. **Gestion des produits avec images** — upload photo via appareil photo ou fichier
5. **Accès à distance** — nécessite un backend + auth réelle

## Architecture

### Routing (`src/App.tsx`)

Toutes les pages sont lazy-loadées via `React.lazy`. Deux groupes :
- **Public** : `/auth/login`, `/auth/register`
- **Protégé** (dans `AppLayout`) : `/dashboard`, `/products`, `/stock`, `/pos`, `/invoices`, `/clients`, `/users`, `/reports`, `/settings`

### Layout (`src/components/layout/`)

- `AppLayout` — flex wrapper : sidebar fixe (240px, collapsible 60px) + zone principale
- `AppSidebar` — sidebar sombre avec état collapsed, active-link highlight via CSS vars
- `Topbar` — header par page avec `title` + `subtitle` optionnel

### Composants UI custom (`src/components/ui/`)

Deux composants spécifiques à l'app au-delà de la librairie shadcn :
- `StatCard` — carte KPI avec label, valeur, tendance, icône Lucide optionnelle
- `StatusBadge` — pill `success | warning | danger | info | default`

### CSS custom classes (`src/index.css`)

Classes utilitaires définies dans `@layer components` :
- `.page-container` — padding + max-width 1600px centré
- `.stat-card` — carte KPI avec border + hover shadow
- `.data-table` — tableau avec header grisé, hover sur lignes
- `.animate-slide-in` — animation d'entrée de page

### Tokens de design

Tous les tokens (couleurs, sidebar, topbar, table, badges) sont des CSS custom properties dans `src/index.css`. Tailwind les mappe via `tailwind.config.ts`. **Toujours utiliser les tokens sémantiques** (`text-success`, `hsl(var(--sidebar-bg))`, `bg-primary/10`) — ne jamais hardcoder de couleurs.

### POS et scanner code-barres (`src/pages/PosPage.tsx`)

Le POS intercepte les événements `keydown` globaux pour les scanners USB (qui se comportent comme un clavier). Un buffer de 100ms + `Enter` valide le code. **Ne pas ajouter d'autres listeners `keydown` globaux qui pourraient interférer.**

### Alias de chemin

`@/` est résolu vers `src/` dans tout le projet.

## Rôles utilisateurs (définis dans le cahier des charges)

| Rôle | Accès |
|------|-------|
| `admin` | Accès complet (produits, stock, utilisateurs, rapports, paramètres) |
| `vendeur` | POS, factures, clients uniquement |

## Modules V2 (ne pas implémenter en V1)

- Statistiques avancées
- Impression intégrée des codes-barres
- Mode hors ligne (cache service worker avancé)
- Suivi des dettes/crédits clients
