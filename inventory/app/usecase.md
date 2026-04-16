# NAOSERVICES INVENTORY — Cas d'usage (Use Cases)

> Application PWA de gestion de stock et ventes — Libreville, Gabon  
> Développée par MPJ HIGH-TECH & Naoservices pour Client X (commerçant détaillant)  
> Version V1 — Interface en français — Monnaie : FCFA

---

## 1. Acteurs

| Acteur | Description | Accès |
|--------|-------------|-------|
| **Admin** | Propriétaire ou responsable désigné. Accès complet à tous les modules. Peut gérer les utilisateurs, consulter les rapports, modifier les paramètres. | Tous les modules |
| **Vendeur** | Employé en caisse. Accès limité aux opérations de vente quotidiennes (POS, consultation produits/stock, consultation clients). | POS, Produits (lecture), Stock (lecture), Clients, Factures (lecture) |
| **Client X (propriétaire)** | Rôle fonctionnel du commerçant — correspond au rôle Admin dans l'application. Supervise l'activité à distance via dashboard et rapports. | Admin complet, y compris accès mobile à distance |

---

## 2. Cas d'usage par module

### 2.1 Authentification

| Acteur | Use Case | Description | Priorité |
|--------|----------|-------------|----------|
| Admin / Vendeur | Se connecter | Saisir email + mot de passe pour accéder à l'application | V1 |
| Admin / Vendeur | Se déconnecter | Terminer la session en cours | V1 |
| Admin | S'inscrire (premier compte) | Créer le compte administrateur initial de la boutique | V1 |
| Admin | Réinitialiser un mot de passe | Réinitialiser le mot de passe d'un utilisateur | V2 |

---

### 2.2 Module Produits (`/products`)

| Acteur | Use Case | Description | Priorité |
|--------|----------|-------------|----------|
| Admin | Ajouter un produit | Créer une fiche produit avec nom, prix de vente, catégorie, image, code-barres, quantité initiale | V1 |
| Admin | Modifier un produit | Mettre à jour les informations d'un produit existant | V1 |
| Admin | Supprimer un produit | Retirer un produit du catalogue | V1 |
| Admin | Rechercher un produit | Chercher par nom ou code-barres dans le catalogue | V1 |
| Admin | Ajouter une image produit | Prendre une photo via l'appareil photo ou uploader une image | V1 |
| Admin | Générer un code-barres | Créer un code-barres personnalisé si le produit n'en possède pas | V1 |
| Admin | Imprimer un code-barres | Exporter / imprimer l'étiquette code-barres à coller sur l'article | V1 |
| Admin | Filtrer par catégorie | Afficher les produits par catégorie (Alimentaire, Boissons, Hygiène, Entretien…) | V1 |
| Vendeur | Consulter le catalogue | Voir la liste des produits avec prix et statut stock | V1 |

---

### 2.3 Module Stock (`/stock`)

| Acteur | Use Case | Description | Priorité |
|--------|----------|-------------|----------|
| Admin | Visualiser l'état du stock | Voir le tableau de bord stock : normal, bas, critique par produit | V1 |
| Admin | Définir les seuils min/max | Configurer le stock minimum et maximum par produit | V1 |
| Admin | Recevoir une alerte stock bas | Voir les produits dont le stock est sous le seuil minimum | V1 |
| Admin | Recevoir une alerte stock critique | Voir les produits dont le stock est inférieur à 50% du minimum | V1 |
| Admin | Ajuster le stock manuellement | Corriger une quantité (inventaire, casse, erreur de saisie) | V1 |
| Admin | Consulter l'historique des mouvements | Voir les entrées/sorties de stock avec dates et causes | V2 |
| Vendeur | Consulter l'état du stock | Voir les niveaux de stock actuels (lecture seule) | V1 |

---

### 2.4 Module POS / Caisse (`/pos`)

| Acteur | Use Case | Description | Priorité |
|--------|----------|-------------|----------|
| Vendeur / Admin | Démarrer une vente | Ouvrir une nouvelle session de caisse | V1 |
| Vendeur / Admin | Scanner un produit (USB) | Utiliser le lecteur code-barres plug & play (émulation clavier) pour ajouter au panier | V1 |
| Vendeur / Admin | Rechercher et ajouter un produit | Chercher un produit par nom dans la grille et cliquer pour l'ajouter au panier | V1 |
| Vendeur / Admin | Modifier la quantité d'un article | Augmenter / diminuer la quantité d'un article dans le panier | V1 |
| Vendeur / Admin | Supprimer un article du panier | Retirer un article du panier en cours | V1 |
| Vendeur / Admin | Vider le panier | Annuler la totalité du panier en cours | V1 |
| Vendeur / Admin | Encaisser | Passer à l'étape de paiement avec affichage du total | V1 |
| Vendeur / Admin | Saisir le montant reçu | Entrer la somme remise par le client (clavier ou boutons rapides) | V1 |
| Vendeur / Admin | Utiliser un montant rapide | Sélectionner un montant prédéfini (500, 1 000, 2 000, 5 000, 10 000, 25 000, 50 000 FCFA) | V1 |
| Vendeur / Admin | Utiliser le montant exact | Saisir automatiquement le total exact (monnaie = 0) | V1 |
| Vendeur / Admin | Valider le paiement | Confirmer la vente si le montant reçu >= total | V1 |
| Vendeur / Admin | Voir la monnaie à rendre | Affichage automatique du rendu monnaie après validation | V1 |
| Vendeur / Admin | Imprimer la facture | Imprimer le ticket/reçu de la vente depuis l'écran de confirmation | V1 |
| Vendeur / Admin | Démarrer une nouvelle vente | Réinitialiser le panier après une vente terminée | V1 |
| Vendeur / Admin | Associer un client à la vente | Lier une vente à un client enregistré (optionnel) | V1 |

---

### 2.5 Module Factures (`/invoices`)

| Acteur | Use Case | Description | Priorité |
|--------|----------|-------------|----------|
| Admin / Vendeur | Consulter l'historique des factures | Voir la liste de toutes les factures générées avec statut payé/impayé | V1 |
| Admin / Vendeur | Rechercher une facture | Chercher par numéro de facture ou nom client | V1 |
| Admin / Vendeur | Visualiser une facture | Ouvrir le détail d'une facture (articles, total, client, date/heure) | V1 |
| Admin / Vendeur | Imprimer une facture | Imprimer une facture depuis l'historique | V1 |
| Admin | Exporter les factures | Télécharger l'historique des factures (CSV / PDF) | V1 |
| Admin | Marquer une facture comme payée | Changer le statut d'une facture impayée en payée | V2 |

---

### 2.6 Module Clients (`/clients`)

| Acteur | Use Case | Description | Priorité |
|--------|----------|-------------|----------|
| Admin / Vendeur | Ajouter un client | Créer une fiche client (nom, téléphone, email optionnel) | V1 |
| Admin / Vendeur | Rechercher un client | Chercher par nom ou numéro de téléphone | V1 |
| Admin / Vendeur | Consulter la fiche client | Voir le profil, le nombre d'achats, le total dépensé et la date du dernier achat | V1 |
| Admin | Modifier un client | Mettre à jour les informations d'un client | V1 |
| Admin | Supprimer un client | Retirer un client de la base | V1 |
| Admin | Consulter l'historique d'achat | Voir les factures liées à un client donné | V1 |
| Admin | Gérer les dettes / crédits | Activer le suivi des soldes clients (crédit / dette) | V2 |

---

### 2.7 Module Utilisateurs (`/users`)

| Acteur | Use Case | Description | Priorité |
|--------|----------|-------------|----------|
| Admin | Créer un utilisateur | Ajouter un nouvel utilisateur (vendeur ou admin) avec email et rôle | V1 |
| Admin | Modifier un utilisateur | Changer le nom, l'email ou le rôle d'un utilisateur existant | V1 |
| Admin | Activer / Désactiver un compte | Bloquer ou réactiver l'accès d'un utilisateur sans le supprimer | V1 |
| Admin | Supprimer un utilisateur | Retirer définitivement un compte de l'application | V1 |
| Admin | Consulter les connexions | Voir la date et l'heure de la dernière connexion par utilisateur | V1 |
| Admin | Voir les ventes par utilisateur | Suivre les ventes réalisées par chaque vendeur | V1 |
| Admin | Réinitialiser un mot de passe | Générer un nouveau mot de passe pour un utilisateur | V2 |

---

### 2.8 Module Rapports (`/reports`)

| Acteur | Use Case | Description | Priorité |
|--------|----------|-------------|----------|
| Admin | Consulter les ventes du jour | Voir le total des ventes et le nombre de transactions de la journée | V1 |
| Admin | Consulter l'historique des ventes | Voir les ventes par période (jour, semaine, mois) | V1 |
| Admin | Suivre l'activité à distance | Accéder aux rapports depuis un appareil mobile hors du magasin | V1 |
| Admin | Identifier les produits les plus vendus | Voir le classement des articles par quantité vendue | V2 |
| Admin | Exporter un rapport | Télécharger un rapport de ventes en CSV ou PDF | V2 |
| Admin | Statistiques avancées | Courbes de tendance, analyse par catégorie, marges | V2 |

---

### 2.9 Module Paramètres (`/settings`)

| Acteur | Use Case | Description | Priorité |
|--------|----------|-------------|----------|
| Admin | Configurer les informations de la boutique | Nom, adresse, téléphone, logo — affiché sur les factures | V1 |
| Admin | Gérer les catégories de produits | Ajouter / modifier / supprimer les catégories disponibles | V1 |
| Admin | Configurer les montants rapides du POS | Personnaliser les boutons de montants prédéfinis à la caisse | V1 |
| Admin | Configurer l'en-tête de facture | Personnaliser le texte imprimé en haut des factures | V1 |
| Admin | Installer la PWA | Ajouter l'application à l'écran d'accueil (mobile / tablette / PC) | V1 |

---

## 3. Diagrammes des flux principaux

### 3.1 Flux de vente (POS)

```
Vendeur
  │
  ├─── Ouvre /pos ──────────────────────────────────────────┐
  │                                                          │
  │    [Scanner USB]           [Recherche manuelle]         │
  │    Code-barres → buffer    Tapez nom → filtre catalogue  │
  │         │                           │                    │
  │         └──────────┬────────────────┘                   │
  │                    ▼                                     │
  │             Produit ajouté au PANIER                     │
  │             (qty++ si déjà présent)                     │
  │                    │                                     │
  │         ┌──────────┤                                     │
  │         │          ▼                                     │
  │         │    Ajuster quantité (+/-) / Supprimer         │
  │         │          │                                     │
  │         └──────────┘                                     │
  │                    │                                     │
  │              [Encaisser]                                 │
  │                    │                                     │
  │                    ▼                                     │
  │         Saisir montant reçu                              │
  │         (clavier ou bouton rapide)                       │
  │                    │                                     │
  │         Montant >= Total ?                               │
  │              │          │                                │
  │             NON        OUI                               │
  │              │          │                                │
  │         Désactivé   [Valider]                            │
  │                          │                               │
  │                          ▼                               │
  │                 Vente enregistrée                        │
  │                 Stock mis à jour                         │
  │                 Facture générée (FAC-AAAA-XXX)          │
  │                 Monnaie affichée                         │
  │                          │                               │
  │              ┌───────────┴───────────┐                   │
  │              │                       │                   │
  │        [Imprimer]            [Nouvelle vente]            │
  └──────────────────────────────────────────────────────────┘
```

---

### 3.2 Flux de gestion du stock

```
Admin
  │
  ├─── Ouvre /stock
  │         │
  │         ▼
  │    Vue tableau de bord stock
  │    ┌─────────────────────────────────┐
  │    │  Normal   │   Bas   │ Critique  │
  │    │ stock > min│ ≤ min  │ ≤ min×0.5│
  │    └─────────────────────────────────┘
  │         │
  │    [Action requise sur Critique / Bas]
  │         │
  │         ▼
  │    Ouvre /products → Modifier quantité
  │         │
  │         ▼
  │    Stock mis à jour → Vue rechargée
  │
  │    [Chaque vente POS]
  │         │
  │         ▼
  │    Décrémentation automatique du stock
  │    → Nouveau statut calculé (Normal/Bas/Critique)
```

---

### 3.3 Flux d'accès et permissions

```
Utilisateur non connecté
  │
  ▼
/auth/login
  │
  ├─── Identifiants valides ?
  │         │              │
  │        OUI             NON → Rester sur login
  │         │
  │         ▼
  │    Rôle vérifié
  │         │
  │    ┌────┴──────┐
  │    │           │
  │  Admin      Vendeur
  │    │           │
  │    │           ├── /pos          (plein accès)
  │    │           ├── /products     (lecture seule)
  │    │           ├── /stock        (lecture seule)
  │    │           ├── /invoices     (lecture + impression)
  │    │           └── /clients      (lecture + création)
  │    │
  │    └── Tous les modules ci-dessus PLUS :
  │         ├── /users      (CRUD complet)
  │         ├── /reports    (complet)
  │         └── /settings   (complet)
```

---

### 3.4 Flux de facturation

```
Vente validée (POS)
  │
  ▼
Numéro auto généré : FAC-{AAAA}-{NNN}
  │
  ▼
Facture créée avec :
  - N° facture
  - Date et heure
  - Client (comptoir ou nommé)
  - Liste des articles (nom, prix unitaire, qté, sous-total)
  - Total TTC
  - Montant reçu
  - Monnaie rendue
  │
  ├─── Impression immédiate depuis POS
  └─── Archivée dans /invoices (consultable, réimprimable)
```

---

## 4. Règles métier

### 4.1 Gestion du stock

| Règle | Détail |
|-------|--------|
| **Seuil critique** | Stock actuel <= 50% du stock minimum → Statut "Critique" (rouge) |
| **Seuil bas** | Stock actuel > 50% du minimum ET <= minimum → Statut "Bas" (orange) |
| **Stock normal** | Stock actuel > minimum → Statut "Normal" (vert) |
| **Décrémentation automatique** | Chaque validation de vente POS décrémente le stock de la quantité vendue |
| **Stock minimum obligatoire** | Chaque produit doit avoir un seuil minimum défini pour activer les alertes |
| **Vente sous stock zéro** | A définir en V1 : bloquer ou autoriser (actuellement non bloqué) |

### 4.2 Calcul monnaie (POS)

| Règle | Détail |
|-------|--------|
| **Formule** | Monnaie rendue = Montant reçu − Total panier |
| **Validation bloquée** | Le bouton "Valider" est désactivé si Montant reçu < Total |
| **Montant exact** | Bouton "Exact" remplit automatiquement le champ avec le total → monnaie = 0 |
| **Montants rapides** | Valeurs prédéfinies : 500, 1 000, 2 000, 5 000, 10 000, 25 000, 50 000 FCFA |
| **Monnaie affichée** | `Math.max(0, montantReçu − total)` — jamais négatif |
| **Unité monétaire** | Franc CFA (FCFA) — pas de centimes — arrondi entier |

### 4.3 Numérotation des factures

| Règle | Détail |
|-------|--------|
| **Format** | `FAC-{AAAA}-{NNN}` — exemple : `FAC-2026-001` |
| **Séquence** | Numéro incrémental par année civile — repart à 001 chaque 1er janvier |
| **Unicité** | Chaque facture a un identifiant unique non réutilisable |
| **Client comptoir** | Si aucun client sélectionné → libellé "Client comptoir" sur la facture |

### 4.4 Scanner code-barres

| Règle | Détail |
|-------|--------|
| **Mode de fonctionnement** | Le scanner USB est reconnu comme clavier (plug & play, zéro pilote) |
| **Délai de capture** | Buffer de saisie avec timeout 100ms — distingue saisie humaine vs scanner |
| **Longueur minimale** | Code-barres reconnu à partir de 4 caractères + touche Entrée |
| **Conflit avec recherche** | Si le focus est sur le champ de recherche, le buffer scanner est ignoré |
| **Produit non trouvé** | Si le code-barres n'existe pas dans le catalogue → aucun ajout, pas d'alerte (à améliorer en V2) |

### 4.5 Rôles et permissions

| Règle | Détail |
|-------|--------|
| **Rôles disponibles** | Admin et Vendeur uniquement en V1 |
| **Admin unique recommandé** | Un seul compte Admin par boutique en V1 (Client X ou gérant) |
| **Vendeur restreint** | Un vendeur ne peut pas créer/modifier des produits, gérer les utilisateurs, accéder aux rapports complets ni aux paramètres |
| **Traçabilité** | Chaque vente est associée à l'utilisateur connecté (qui a vendu quoi) |
| **Compte inactif** | Un utilisateur inactif ne peut plus se connecter — ses données historiques sont conservées |

### 4.6 Images produits

| Règle | Détail |
|-------|--------|
| **Sources acceptées** | Prise de vue directe via appareil photo ou upload depuis galerie |
| **Affichage catalogue** | Chaque produit affiche son image dans la grille POS et dans la liste produits |
| **Image manquante** | Fallback sur emoji ou icône générique si aucune image n'est définie |

### 4.7 PWA

| Règle | Détail |
|-------|--------|
| **Installation** | Installable sur Android, iOS, tablette, PC via le navigateur (sans Play Store) |
| **Mode hors-ligne** | Non disponible en V1 — connexion internet requise pour synchronisation |
| **Accès à distance** | Le propriétaire (Admin) peut accéder à l'application depuis n'importe quel appareil connecté |

---

## 5. Matrice de permissions résumée

| Module | Admin | Vendeur |
|--------|-------|---------|
| Dashboard | Lecture | Lecture |
| Produits | CRUD + images + codes-barres | Lecture seule |
| Stock | Lecture + ajustement manuel | Lecture seule |
| POS / Caisse | Vente complète | Vente complète |
| Factures | Lecture + impression + export | Lecture + impression |
| Clients | CRUD + historique | Créer + consulter |
| Utilisateurs | CRUD complet | Aucun accès |
| Rapports | Complet | Aucun accès |
| Paramètres | Complet | Aucun accès |

---

## 6. Évolutions prévues V2

| Fonctionnalité | Priorité V2 | Module concerné |
|----------------|-------------|-----------------|
| Mode hors-ligne (Service Worker + sync) | Haute | PWA / Stock / POS |
| Impression intégrée codes-barres | Haute | Produits |
| Statistiques avancées et courbes | Haute | Rapports |
| Gestion des dettes / crédits clients | Moyenne | Clients |
| Alerte produit non trouvé au scan | Moyenne | POS |
| Réinitialisation mot de passe | Moyenne | Utilisateurs |
| Export rapport PDF/CSV | Moyenne | Rapports |
| Marquer facture payée | Basse | Factures |
| Historique des mouvements de stock | Basse | Stock |
| Multi-boutiques | Basse | Paramètres |

---

*Document généré le 16/04/2026 — NAOSERVICES × MPJ HIGH-TECH*
