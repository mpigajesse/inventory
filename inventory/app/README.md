# NAOSERVICES INVENTORY

**Application PWA de gestion de stock et de ventes**

Développée conjointement par **Naoservices** et **MPJ HIGH-TECH** pour un client commerçant détaillant à Libreville, Gabon.

---

## 📋 Vue d'ensemble

NAOSERVICES INVENTORY est une application web moderne et progressive (PWA) conçue pour simplifier la gestion complète du stock, des ventes et de la facturation. Elle offre une interface intuitive en français optimisée pour les téléphones, tablettes et ordinateurs, permettant une utilisation fluide en magasin et un suivi à distance.

**Caractéristiques principales :**
- Gestion complète du stock en temps réel
- Module de caisse (POS) avec scanner code-barres (USB plug & play)
- Facturation automatique
- Suivi des ventes et historique clients
- Gestion multi-utilisateurs avec rôles (admin / vendeur)
- Installation PWA native sur mobile et desktop
- Interface entièrement en **français**
- Devise : **FCFA**

---

## 🚀 Démarrage rapide

### Prérequis

- **Node.js** >= 16 (recommandé >= 18)
- **npm** >= 8

### Installation

```bash
cd inventory/app
npm install
```

### Lancer le serveur de développement

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:8080`

### Accès initial

- **URL** : http://localhost:8080
- **Page d'authentification** : Disponible au premier lancement
- **Note** : En V1, le bouton "Se connecter" navigue directement au tableau de bord (authentification mock)

---

## 📦 Commandes disponibles

```bash
# Démarrage du serveur de développement (port 8080)
npm run dev

# Build production optimisé
npm run build

# Vérification avec ESLint
npm run lint

# Tests unitaires (exécution unique)
npm run test

# Tests unitaires (mode watch)
npm run test:watch

# Aperçu du build production
npm run preview
```

**Pour lancer un seul fichier de test :**
```bash
npx vitest run src/path/to/file.test.ts
```

---

## 🛠 Stack technique

| Domaine | Technologie |
|---------|-------------|
| **Build & Dev Server** | Vite 5+ |
| **Framework** | React 18 + TypeScript |
| **Routing** | react-router-dom v6 (lazy loading) |
| **Styling** | Tailwind CSS + CSS Custom Properties |
| **Composants UI** | shadcn/ui (Radix UI) |
| **Formulaires** | react-hook-form + Zod |
| **Data Fetching** | TanStack Query (préinstallé, prêt pour API) |
| **Tests** | Vitest + Testing Library |
| **Linting** | ESLint |

**Configuration TypeScript :** `strict: false`, `noImplicitAny: false`

---

## 🏗 Architecture

### Structure du routing

Toutes les routes sont lazy-loadées pour optimiser les performances.

**Routes publiques :**
- `/auth/login` — Formulaire de connexion
- `/auth/register` — Formulaire d'inscription

**Routes protégées** (à l'intérieur de `AppLayout`) :
- `/dashboard` — Tableau de bord avec KPIs
- `/products` — Gestion des produits
- `/stock` — Gestion du stock
- `/pos` — Module de caisse (POS) avec scanner
- `/invoices` — Historique des factures
- `/clients` — Gestion des clients
- `/users` — Gestion des utilisateurs
- `/reports` — Rapports et statistiques
- `/settings` — Paramètres entreprise
- `/notifications` — Centre de notifications
- `/profile` — Profil utilisateur
- `/barcodes` — Gestion des codes-barres
- `/suppliers` — Gestion des fournisseurs

### Layout et composants

**Composants de layout** (`src/components/layout/`) :
- `AppLayout` — Wrapper principal avec sidebar collapsible et zone de contenu
- `AppSidebar` — Barre latérale avec navigation et état collapsed
- `Topbar` — En-tête de page avec titre et sous-titre

**Composants UI personnalisés** (`src/components/ui/`) :
- `StatCard` — Cartes KPI avec label, valeur, tendance et icône
- `StatusBadge` — Badge de statut (success, warning, danger, info, default)

### Tokens de design

Tous les tokens visuels sont définis comme **CSS Custom Properties** dans `src/index.css` :
- Couleurs (primaire, succès, danger, warning, info)
- Sidebar et topbar
- Tableaux de données
- Badges et statuts

**Toujours utiliser les tokens sémantiques** :
```css
/* Correct ✓ */
color: hsl(var(--text-primary));
background-color: var(--success);

/* À éviter ✗ */
color: #1a1a1a;
background-color: #22c55e;
```

### Classes utilitaires personnalisées

Définies dans `src/index.css` :
- `.page-container` — Padding + max-width 1600px centré
- `.stat-card` — Styling des cartes KPI
- `.data-table` — Styling des tableaux
- `.animate-slide-in` — Animation d'entrée de page

### POS et scanner code-barres

Le module POS (`src/pages/PosPage.tsx`) intercepte les événements `keydown` globaux pour les scanners USB (reconnus comme clavier). Un buffer de 100ms valide le code à la réception d'`Enter`.

**Important :** Ne pas ajouter d'autres listeners `keydown` globaux qui pourraient créer des conflits.

### Alias de chemin

`@/` est résolu vers `src/` dans tout le projet (configuré dans Vite et TypeScript).

---

## 👥 Rôles utilisateurs

L'application supporte deux rôles utilisateurs avec permissions différentes :

| Rôle | Accès |
|------|-------|
| **admin** | Accès complet : produits, stock, utilisateurs, rapports, paramètres, gestion des fournisseurs |
| **vendeur** | Accès limité : POS (caisse), factures, clients uniquement |

---

## 📊 État actuel (V1 en cours)

### Ce qui est implémenté (UI prototype)

L'application est actuellement un **prototype UI avec données mock** hardcodées dans chaque page. Aucun backend ni API n'est encore connecté.

Modules construits :

- **Authentification** — Formulaires login/register (logique mock, navigation directe au dashboard)
- **Dashboard** — KPIs, ventes récentes, alertes stock bas
- **Produits** — Liste avec recherche par nom/code-barres, ajout/modification/suppression
- **Stock** — Tableau avec indicateurs de niveau (critique/bas/normal)
- **POS/Caisse** — Module le plus avancé :
  - Scanner code-barres fonctionnel
  - Gestion du panier
  - Calcul automatique des totaux
  - Modal de paiement avec calcul de monnaie
- **Factures** — Liste consultable (impression non fonctionnelle)
- **Clients** — Fiches client avec historique d'achats
- **Utilisateurs** — Gestion des rôles (admin / vendeur)
- **Rapports** — Graphiques ventes/semaine, top produits
- **Paramètres** — Configuration entreprise (nom, adresse, NIF)
- **Notifications** — Centre de notifications
- **Profil** — Gestion du profil utilisateur
- **Codes-barres** — Génération et gestion
- **Fournisseurs** — Gestion des fournisseurs
- **Pages CRUD** — Interfaces complètes de gestion
- **RBAC** — Contrôle d'accès basé sur les rôles
- **Export Excel** — Export de données en Excel
- **Thèmes par utilisateur** — Personnalisation des préférences visuelles

### Prochaines étapes V1

Les priorités de développement sont (dans l'ordre du cahier des charges) :

1. **Scanner + vente** — Connecter le POS au stock réel
2. **Mise à jour automatique du stock** — Décrémenter après chaque vente
3. **Facturation** — Génération PDF + impression (numéro, date, articles, total, monnaie)
4. **Gestion des produits avec images** — Upload photo (appareil photo ou fichier)
5. **Accès à distance** — Nécessite un backend + authentification réelle

---

## 🔄 Roadmap V2 (non implémenté en V1)

- Backend Supabase pour persistance des données
- Stockage d'images Cloudinary
- Authentification réelle
- Mode hors ligne avec cache service worker avancé
- Statistiques avancées
- Impression intégrée des codes-barres
- Suivi des dettes/crédits clients
- Synchronisation multi-appareils

---

## 🎯 Fonctionnalités par domaine

### Gestion des produits

- Ajouter / modifier / supprimer des produits
- Upload de photos (appareil photo ou fichier)
- Génération et gestion des codes-barres
- Recherche par nom ou code-barres
- Affichage des images de produits

### Gestion du stock

- Enregistrement complet du stock
- Mise à jour automatique après chaque vente
- Indicateurs de niveau (critique / bas / normal)
- Alertes pour stock faible
- Historique des mouvements

### Module de vente (Caisse)

- Lecteur code-barres USB (plug & play, aucun pilote requis)
- Scan rapide des produits
- Panier avec ajout/suppression dynamique
- Calcul automatique :
  - Total de la vente
  - Quantité d'articles
  - Monnaie à rendre
- Modal de paiement avec gestion de la devise (FCFA)

### Facturation

Génération automatique de factures avec :
- Numéro de facture séquentiel
- Numéro client (optionnel)
- Date et heure
- Liste des articles (nom, prix, quantité, total)
- Montant total
- Somme payée
- Monnaie rendue
- Impression ou export PDF (à implémenter)

### Suivi des ventes

- Historique complet des ventes
- Consultation en temps réel des ventes du jour
- Accès à distance via compte administrateur
- Rapports par période
- Top des produits

### Gestion des clients

- Enregistrement des clients
- Historique des achats par client
- Association de ventes à un client
- Suivi des dettes/crédits (futur V2)

### Gestion multi-utilisateurs

- Création de comptes utilisateur (admin / vendeur)
- Rôles et permissions par profil
- Suivi des actions par utilisateur
- Profil utilisateur personnalisable avec thème

---

## 🌐 Compatibilité et déploiement

### Plateformes supportées

- **Téléphones** — Android et iOS (via PWA)
- **Tablettes** — Android et iOS
- **Ordinateurs** — Windows, macOS, Linux
- **Lecteur de code-barres** — USB ou Bluetooth (reconnu comme clavier)

### Installation PWA

L'application peut être installée comme une application native :

1. **Sur mobile :**
   - Ouvrir dans Chrome / Safari
   - Taper sur le menu → "Ajouter à l'écran d'accueil"

2. **Sur desktop :**
   - Cliquer sur l'icône d'installation (barre d'adresse ou menu)

3. **Avantages :**
   - Installation rapide sans Play Store / App Store
   - Fonctionnement en plein écran
   - Expérience fluide et native
   - Pas de publicités ou frais de publication

---

## 📝 Conventions de codage

### Fichiers et dossiers

- Composants React : `PascalCase` (ex: `ProductCard.tsx`)
- Hooks personnalisés : `camelCase` avec préfixe `use` (ex: `useProductData.ts`)
- Utilitaires : `camelCase` (ex: `formatPrice.ts`)
- Fichiers de test : même nom que le module + `.test.ts` (ex: `Button.test.tsx`)

### Styles

- **Toujours utiliser Tailwind CSS** pour le styling
- **Utiliser les CSS Custom Properties** pour les tokens de design
- **Ne jamais hardcoder** les couleurs ou espacements
- Consulter `src/index.css` pour la liste complète des tokens

### Composants

- Garder les composants < 50 lignes quand possible
- Utiliser `React.lazy` pour le code splitting
- Préférer les composants fonctionnels
- Externaliser la logique complexe en hooks ou utilitaires

### Formulaires

- Utiliser `react-hook-form` pour tous les formulaires
- Valider avec `Zod` (schémas TypeScript-first)
- Afficher les erreurs de validation clairement

---

## 🧪 Tests

### Exécuter les tests

```bash
# Exécution unique
npm run test

# Mode watch (fichiers spécifiques changent)
npm run test:watch

# Tester un fichier spécifique
npx vitest run src/components/Button.test.tsx
```

### Environnement de test

- Framework : Vitest
- Librairie : React Testing Library
- Environnement : jsdom

### Structure des tests

Les tests doivent être proches des fichiers testés :
```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
├── hooks/
│   ├── useProductData.ts
│   └── useProductData.test.ts
```

---

## 🔧 Développement

### Ajouter une nouvelle page

1. Créer le fichier dans `src/pages/MyPage.tsx`
2. Ajouter la route dans `src/App.tsx` avec lazy loading
3. Ajouter le lien dans la sidebar `src/components/layout/AppSidebar.tsx`

### Ajouter un nouveau composant UI

1. Utiliser `npx shadcn-ui@latest add <component>` si disponible
2. Ou créer dans `src/components/ui/MyComponent.tsx`
3. Exporter dans `src/components/ui/index.ts`

### Modifier les tokens de design

Tous les tokens sont dans `src/index.css`. Modifier les CSS Custom Properties au niveau `:root`.

---

## 📚 Ressources utiles

- [Documentation React 18](https://react.dev)
- [Documentation Vite](https://vitejs.dev)
- [Documentation Tailwind CSS](https://tailwindcss.com)
- [Documentation shadcn/ui](https://ui.shadcn.com)
- [Documentation react-router-dom v6](https://reactrouter.com)
- [Documentation react-hook-form](https://react-hook-form.com)
- [Documentation Zod](https://zod.dev)
- [Documentation Vitest](https://vitest.dev)

---

## 📞 Support

**Contact client :**
- Téléphone : +241 07 40 13 02
- Lieu : Libreville, Gabon

**Développement :**
- Naoservices
- MPJ HIGH-TECH

---

## 📄 Licence

Propriétaire. Tous droits réservés © 2024 Naoservices × MPJ HIGH-TECH

---

**Dernière mise à jour :** Avril 2024  
**Version :** V1 (prototype UI)
