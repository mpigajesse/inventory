# NAOSERVICES INVENTORY — Bibliothèques installées

> Stack : React 18 + Vite + TypeScript + Tailwind CSS  
> Dernière mise à jour : 2026-04-16

---

## UI & Composants

| Bibliothèque | Version | Rôle dans ce projet |
|---|---|---|
| `@radix-ui/*` | ^1.x – ^2.x | Primitives accessibles (dialog, select, tabs, toast, etc.) utilisées par shadcn/ui |
| `lucide-react` | ^0.462.0 | Icones SVG pour l'interface (nav, boutons, alertes stock) |
| `class-variance-authority` | ^0.7.1 | Variantes de styles Tailwind pour les composants |
| `clsx` | ^2.1.1 | Fusion conditionnelle de classes CSS |
| `tailwind-merge` | ^2.6.0 | Fusion intelligente de classes Tailwind (évite les conflits) |
| `tailwindcss-animate` | ^1.0.7 | Animations Tailwind pour transitions UI |
| `cmdk` | ^1.1.1 | Palette de commandes (recherche produits rapide) |
| `embla-carousel-react` | ^8.6.0 | Carousel pour galeries produits |
| `vaul` | ^0.9.9 | Drawer/bottom-sheet mobile (panier POS sur mobile) |
| `react-resizable-panels` | ^2.1.9 | Panneaux redimensionnables (layout POS split-screen) |
| `next-themes` | ^0.3.0 | Gestion thème clair/sombre |
| `input-otp` | ^1.4.2 | Saisie code PIN (accès caissier) |

---

## Formulaires & Validation

| Bibliothèque | Version | Rôle dans ce projet |
|---|---|---|
| `react-hook-form` | ^7.61.1 | Gestion formulaires (ajout produit, config fournisseur, etc.) |
| `@hookform/resolvers` | ^3.10.0 | Intégration Zod avec react-hook-form |
| `zod` | ^3.25.76 | Schémas de validation (produits, ventes, fournisseurs) |

---

## État Global

| Bibliothèque | Version | Rôle dans ce projet |
|---|---|---|
| `zustand` | ^5.0.12 | Store global léger : panier POS, session utilisateur, thème, file d'alertes stock |

---

## Données & Requêtes

| Bibliothèque | Version | Rôle dans ce projet |
|---|---|---|
| `@tanstack/react-query` | ^5.83.0 | Cache et synchronisation des données (produits, ventes, stock) |
| `axios` | ^1.15.0 | Client HTTP pour future API Django backend |
| `date-fns` | ^3.6.0 | Manipulation et formatage des dates (rapports, filtres journaliers) |

---

## Graphiques & Visualisation

| Bibliothèque | Version | Rôle dans ce projet |
|---|---|---|
| `recharts` | ^2.15.4 | Graphiques dashboard : évolution stock, chiffre d'affaires, ventes par période |

---

## Navigation

| Bibliothèque | Version | Rôle dans ce projet |
|---|---|---|
| `react-router-dom` | ^6.30.1 | Routing SPA (POS, Inventaire, Factures, Dashboard, Paramètres) |
| `react-day-picker` | ^8.10.1 | Sélecteur de dates (filtres rapports, dates de commande) |

---

## Notifications & Alertes

| Bibliothèque | Version | Rôle dans ce projet |
|---|---|---|
| `sonner` | ^1.7.4 | Toasts : confirmation de vente, alerte stock bas, erreurs réseau |

---

## PDF & Impression

| Bibliothèque | Version | Rôle dans ce projet |
|---|---|---|
| `@react-pdf/renderer` | ^4.5.1 | Génération PDF des factures (format A4, logo, lignes de commande, totaux) |
| `react-to-print` | ^3.3.0 | Impression thermique du reçu caisse (format 80mm, sans dialogue système) |

---

## Codes-barres

| Bibliothèque | Version | Rôle dans ce projet |
|---|---|---|
| `react-barcode` | ^1.6.1 | Composant React affichant un code-barres SVG/canvas (fiche produit, étiquettes) |
| `jsbarcode` | ^3.12.3 | Génération de codes-barres programmatique (intégré dans les PDF de factures) |
| `html5-qrcode` | ^2.3.8 | Scan QR code / code-barres via caméra du mobile (fallback sans scanner USB) |

---

## PWA & Service Worker

| Bibliothèque | Version | Type | Rôle dans ce projet |
|---|---|---|---|
| `vite-plugin-pwa` | ^1.2.0 | devDependency | Génère le manifest PWA, Service Worker, et hooks `useRegisterSW` pour push notifications |
| `workbox-window` | ^7.4.0 | devDependency | Gestion du cycle de vie du Service Worker (mise à jour, offline, background sync) |

---

## Tests

| Bibliothèque | Version | Type | Rôle dans ce projet |
|---|---|---|---|
| `vitest` | ^3.2.4 | devDependency | Framework de tests unitaires (compatible Vite) |
| `@testing-library/react` | ^16.0.0 | devDependency | Tests de composants React |
| `@testing-library/jest-dom` | ^6.6.0 | devDependency | Matchers DOM pour assertions de test |
| `jsdom` | ^20.0.3 | devDependency | Environnement DOM simulé pour les tests |

---

## Build & Tooling

| Bibliothèque | Version | Type | Rôle dans ce projet |
|---|---|---|---|
| `vite` | ^5.4.19 | devDependency | Bundler ultra-rapide, HMR en développement |
| `@vitejs/plugin-react-swc` | ^3.11.0 | devDependency | Compilation React avec SWC (plus rapide que Babel) |
| `typescript` | ^5.8.3 | devDependency | Typage statique |
| `typescript-eslint` | ^8.38.0 | devDependency | Linting TypeScript |
| `eslint` | ^9.32.0 | devDependency | Linter JS/TS |
| `autoprefixer` | ^10.4.21 | devDependency | Préfixes CSS automatiques |
| `postcss` | ^8.5.6 | devDependency | Traitement CSS |
| `tailwindcss` | ^3.4.17 | devDependency | Framework CSS utilitaire |
| `@tailwindcss/typography` | ^0.5.16 | devDependency | Plugin typographie Tailwind (rendu factures, rapports) |
| `lovable-tagger` | ^1.1.13 | devDependency | Tagging composants Lovable |

---

## Résumé par fonctionnalité métier

| Fonctionnalité | Bibliothèques utilisées |
|---|---|
| Caisse / POS | `zustand`, `react-hook-form`, `zod`, `sonner`, `react-to-print`, `vaul` |
| Scan produit | `html5-qrcode`, `react-barcode`, `jsbarcode` |
| Factures PDF | `@react-pdf/renderer`, `jsbarcode`, `react-to-print` |
| Gestion stock | `@tanstack/react-query`, `axios`, `zustand`, `sonner` |
| Dashboard | `recharts`, `date-fns`, `@tanstack/react-query` |
| PWA / Push | `vite-plugin-pwa`, `workbox-window` |
| Thème / UI | `next-themes`, `@radix-ui/*`, `lucide-react`, `tailwindcss` |
