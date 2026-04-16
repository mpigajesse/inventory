# NAOSERVICES INVENTORY — Cas d'usage (Use Cases) V1

> Application PWA de gestion de stock et ventes — Libreville, Gabon  
> Développée par MPJ HIGH-TECH & Naoservices pour Client X (commerçant détaillant)  
> Version V1 — Interface en français — Monnaie : FCFA

---

## 1. Acteurs du système

| Acteur | Description | Rôle système |
|--------|-------------|--------------|
| **Admin** | Propriétaire ou gérant principal. Accès complet à tous les modules. Gère les utilisateurs, rapports, paramètres. | `admin` |
| **Vendeur** | Employé caissier. Accès limité aux ventes quotidiennes (POS, consultation produits, clients). | `vendeur` |
| **Client X (Propriétaire)** | Rôle métier du commerçant — correspond au rôle Admin. Supervise à distance via dashboard et rapports. | `admin` |

---

## 2. Cas d'usage par module

### 2.1 Module Authentification

#### UC-AUTH-001 : Se connecter à l'application

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur n'est pas connecté
- Un compte utilisateur existe dans la base de données
- L'application est accessible

**Flux principal :**
1. L'utilisateur accède à `/auth/login`
2. L'application affiche le formulaire de connexion (email + mot de passe)
3. L'utilisateur saisit son email
4. L'utilisateur saisit son mot de passe
5. L'utilisateur clique sur "Se connecter"
6. Le système valide les identifiants contre la base de données
7. Si valides :
   - Le système authentifie l'utilisateur
   - Crée une session/JWT token
   - Redirige vers `/dashboard`
8. Si invalides :
   - Affiche message d'erreur "Email ou mot de passe incorrect"
   - Reste sur le formulaire

**Flux alternatif :**
- **Si l'utilisateur est déjà connecté :** Redirige directement vers `/dashboard`
- **Si le compte est désactivé :** Affiche "Compte désactivé - Contactez l'administrateur"

**Postconditions :**
- L'utilisateur est connecté
- Session active stockée en mémoire/localStorage
- Rôle de l'utilisateur vérifié pour les permissions futures

---

#### UC-AUTH-002 : Se déconnecter

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est connecté

**Flux principal :**
1. L'utilisateur clique sur "Se déconnecter" (menu profil / sidebar)
2. Le système supprime la session/token
3. Redirige vers `/auth/login`
4. Affiche message optionnel "Vous avez été déconnecté"

**Postconditions :**
- Session terminée
- Aucune donnée sensible en cache
- Utilisateur revient à la page de connexion

---

#### UC-AUTH-003 : S'inscrire (créer le compte Admin initial)

**Acteur :** Admin (première utilisation)  
**Priorité :** V1  
**Préconditions :**
- Aucun compte admin n'existe dans la base de données (première activation)
- L'utilisateur accède à `/auth/register`

**Flux principal :**
1. Le système affiche le formulaire d'inscription
2. L'utilisateur saisit :
   - Nom complet
   - Email
   - Mot de passe (validation : min 8 caractères, 1 majuscule, 1 chiffre)
   - Confirmation du mot de passe
3. L'utilisateur clique sur "S'inscrire"
4. Le système valide les champs
5. Vérifie que l'email n'existe pas déjà
6. Hash le mot de passe (bcrypt)
7. Crée le compte avec rôle `admin`
8. Génère une session
9. Redirige vers `/dashboard`

**Flux alternatif :**
- **Si un compte admin existe déjà :** Redirige vers `/auth/login` (pas d'accès à register)
- **Si l'email existe :** Affiche "Cet email est déjà utilisé"
- **Si validation échoue :** Affiche les erreurs détaillées

**Postconditions :**
- Compte Admin créé dans la base de données
- Utilisateur connecté
- Prêt à configurer les paramètres de la boutique

---

#### UC-AUTH-004 : Réinitialiser un mot de passe (Admin → Utilisateur)

**Acteur :** Admin  
**Priorité :** V2  
**Préconditions :**
- L'Admin est connecté
- Un utilisateur existe dans la base de données

**Flux principal :**
1. Admin accède à `/users`
2. Sélectionne un utilisateur dans la liste
3. Clique sur "Réinitialiser mot de passe"
4. Le système génère un mot de passe temporaire aléatoire
5. Affiche le mot de passe temporaire à l'Admin
6. L'Admin peut copier et communiquer au vendeur
7. (V2) Possibilité d'envoyer par email si configuré

**Postconditions :**
- Mot de passe de l'utilisateur réinitialisé
- L'utilisateur devra changer le mot de passe à sa prochaine connexion

---

### 2.2 Module Dashboard

#### UC-DASH-001 : Consulter le tableau de bord principal

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est connecté

**Flux principal :**
1. L'utilisateur accède à `/dashboard`
2. Le système affiche les KPIs du jour :
   - Ventes du jour (montant total)
   - Nombre de transactions
   - Clients servis
   - Stock critique (nombre de produits)
3. Affiche les ventes récentes (dernières 5-10 transactions)
4. Affiche les alertes stock bas/critique
5. (Admin) Affiche les logs d'activité utilisateurs
6. (Admin) Affiche accès à distance (device info, dernière connexion)

**Flux alternatif :**
- **Si aucune vente du jour :** Affiche 0 ou "Aucune vente"
- **Si aucun stock critique :** Cache la section ou affiche "OK"

**Postconditions :**
- Dashboard affiché avec données en temps réel

---

### 2.3 Module Produits

#### UC-PROD-001 : Ajouter un produit

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- L'Admin est connecté
- Accès au module `/products`

**Flux principal :**
1. Admin clique sur "Ajouter un produit" (bouton "+" ou "Nouveau")
2. Le système affiche un formulaire avec champs :
   - Nom du produit (required)
   - Catégorie (dropdown, required)
   - Prix de vente (number, required, min 0)
   - Prix d'achat (optionnel, pour calcul marge V2)
   - Quantité initiale (number, required, min 0)
   - Stock minimum (number, required, utilisé pour alertes)
   - Code-barres (optionnel, unique)
   - Description (optionnel)
3. Admin remplit les champs
4. Admin peut ajouter une image (appareil photo ou upload fichier)
5. Admin clique sur "Créer"
6. Le système valide les données
7. Crée l'enregistrement produit
8. Générer un code-barres si absent (UUID ou sequence)
9. Redirige vers la fiche produit ou la liste

**Flux alternatif :**
- **Si code-barres existe déjà :** Affiche "Ce code-barres est déjà utilisé"
- **Si catégorie n'existe pas :** Permet de la créer à la volée

**Postconditions :**
- Produit créé avec ID unique
- Image stockée (locale ou cloud)
- Code-barres généré ou saisi
- Produit visible dans le catalogue POS

---

#### UC-PROD-002 : Modifier un produit

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- L'Admin est connecté
- Un produit existe et est sélectionné

**Flux principal :**
1. Admin accède à `/products`
2. Cherche le produit (par nom ou code-barres)
3. Clique sur le produit pour ouvrir la fiche détail
4. Clique sur "Modifier" ou icône edit
5. Le formulaire devient éditable
6. Admin modifie les champs nécessaires :
   - Nom, prix, quantité, stock min, catégorie, description
7. Admin peut changer/ajouter une image
8. Clique sur "Enregistrer"
9. Le système valide et persiste les modifications

**Flux alternatif :**
- **Si code-barres modifié :** Vérifier qu'il n'existe pas déjà
- **Si image supprimée :** Basculer sur image générique/emoji

**Postconditions :**
- Produit mis à jour
- Changements visibles immédiatement dans POS et stock

---

#### UC-PROD-003 : Supprimer un produit

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- L'Admin est connecté
- Un produit existe et est sélectionné

**Flux principal :**
1. Admin accède à la fiche produit
2. Clique sur "Supprimer" ou icône trash
3. Le système affiche une confirmation : "Êtes-vous sûr ? Les factures historiques conserveront les données."
4. Admin clique sur "Confirmer"
5. Le produit est marqué comme inactif (soft delete)
6. N'apparaît plus dans le catalogue POS

**Flux alternatif :**
- **Si le produit a des ventes :** Propose l'archivage (soft delete) plutôt que la suppression physique
- **Si Admin clique "Annuler" :** Reste sur la fiche

**Postconditions :**
- Produit archivé/inactif
- Historique factures conservé
- N'apparaît plus au POS

---

#### UC-PROD-004 : Rechercher un produit

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est connecté
- Module `/products` ou POS ouvert

**Flux principal :**
1. L'utilisateur voit un champ de recherche en haut de la liste produits
2. Saisit un terme : nom, code-barres, ou catégorie
3. Le système filtre en temps réel (debounce 300ms)
4. Affiche les résultats correspondants
5. L'utilisateur peut cliquer sur un produit pour voir les détails

**Flux alternatif :**
- **Si aucun résultat :** Affiche "Aucun produit trouvé"
- **Si recherche vide :** Affiche tous les produits actifs

**Postconditions :**
- Liste filtrée affichée

---

#### UC-PROD-005 : Ajouter une image produit

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Un produit existe et est en édition
- L'appareil a un appareil photo ou galerie

**Flux principal :**
1. Admin clique sur le champ "Image" dans le formulaire produit
2. Le système propose deux options :
   - "Prendre une photo" (accès appareil photo)
   - "Choisir un fichier" (upload galerie/stockage)
3. Admin sélectionne l'option
4. Prend une photo ou sélectionne un fichier
5. Le système compresse/redimensionne l'image (max 2MB, 800x600px)
6. Affiche un aperçu
7. Admin confirme
8. Image stockée (localStorage, IndexedDB, ou cloud) avec référence en base

**Flux alternatif :**
- **Si image > 2MB :** Affiche "Fichier trop volumineux"
- **Si format non supporté :** Affiche "Format non supporté (JPG, PNG, WebP)"

**Postconditions :**
- Image stockée et associée au produit
- Affichée dans le catalogue POS et la liste produits

---

#### UC-PROD-006 : Générer un code-barres personnalisé

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Un produit existe
- Aucun code-barres n'est assigné (ou l'Admin veut le régénérer)

**Flux principal :**
1. Admin ouvre la fiche produit
2. Clique sur "Générer code-barres" (si absent)
3. Le système génère un identifiant unique :
   - Format : `PROD-{AAAA}-{NNN}` ou UUID
   - Enregistre en base
4. Affiche le code-barres généré
5. Admin peut le copier ou imprimer (voir UC-PROD-007)

**Postconditions :**
- Code-barres unique généré et persisté
- Peut être scanné au POS

---

#### UC-PROD-007 : Imprimer un code-barres (étiquette)

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Un produit possède un code-barres
- Admin accède à la fiche produit

**Flux principal :**
1. Admin clique sur "Imprimer code-barres" ou icône print
2. Le système génère un PDF avec :
   - Barcode 128 ou QR code (image scalable)
   - Nom du produit
   - Prix de vente
   - Code-barres texte (lisible)
3. Ouvre la preview d'impression
4. Admin lance l'impression physique
5. Reçoit l'étiquette à coller sur l'article

**Postconditions :**
- Étiquette imprimée prête à coller

---

#### UC-PROD-008 : Filtrer produits par catégorie

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est sur `/products` ou POS
- Des produits existent

**Flux principal :**
1. L'utilisateur voit un dropdown "Catégories" en haut de la liste
2. Clique sur une catégorie (ex: "Alimentaire", "Boissons")
3. La liste se filtre en temps réel
4. Affiche uniquement les produits de cette catégorie
5. Peut sélectionner "Toutes les catégories" pour réinitialiser

**Postconditions :**
- Produits filtrés par catégorie

---

#### UC-PROD-009 : Consulter le catalogue (Vendeur, lecture seule)

**Acteur :** Vendeur  
**Priorité :** V1  
**Préconditions :**
- Le Vendeur est connecté
- Des produits existent

**Flux principal :**
1. Vendeur accède à `/products`
2. Voit la liste en grille ou tableau :
   - Image produit (ou emoji générique)
   - Nom
   - Prix de vente
   - Statut stock (Normal / Bas / Critique)
3. Peut rechercher et filtrer par catégorie
4. Clique sur un produit pour voir les détails (nom, prix, stock)
5. N'a pas accès à "Modifier" ou "Supprimer"

**Postconditions :**
- Catalogue consulté en lecture seule

---

### 2.4 Module Stock

#### UC-STOCK-001 : Visualiser l'état du stock

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est connecté
- Des produits existent

**Flux principal :**
1. L'utilisateur accède à `/stock`
2. Le système affiche un tableau avec colonnes :
   - Nom produit
   - Quantité actuelle
   - Stock minimum
   - Statut (Normal / Bas / Critique)
   - Code-barres
   - Dernière mise à jour
3. Statut calculé :
   - **Normal** : quantité > minimum
   - **Bas** : quantité ≤ minimum ET > (minimum × 0.5)
   - **Critique** : quantité ≤ (minimum × 0.5)
4. Couleurs : vert / orange / rouge
5. Peut trier par colonne ou filtrer

**Postconditions :**
- Vue stock affichée avec statuts à jour

---

#### UC-STOCK-002 : Définir les seuils min/max par produit

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Un produit existe

**Flux principal :**
1. Admin ouvre la fiche produit (depuis `/products` ou `/stock`)
2. Clique sur "Éditer seuils" ou accède à l'onglet "Stock"
3. Voit les champs :
   - Stock minimum (actuellement défini)
   - Stock maximum (optionnel, pour futur)
4. Modifie les valeurs
5. Clique sur "Enregistrer"
6. Le système recalcule immédiatement les statuts de tous les produits

**Postconditions :**
- Seuils mis à jour
- Alertes recalculées en temps réel

---

#### UC-STOCK-003 : Recevoir alerte stock bas

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- Un produit atteint le seuil "Bas"
- L'utilisateur consulte le dashboard ou `/stock`

**Flux principal :**
1. Le système détecte automatiquement que quantité ≤ minimum
2. Affiche une alerte visuelle sur le dashboard (section "Alertes stock")
3. Liste les produits en Bas avec quantité et minimum
4. Code couleur : orange
5. Admin peut cliquer pour accéder à la fiche et ajuster le stock

**Postconditions :**
- Alerte visible et traçable

---

#### UC-STOCK-004 : Recevoir alerte stock critique

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Un produit atteint le seuil "Critique" (≤ 50% du minimum)

**Flux principal :**
1. Le système détecte automatiquement le seuil critique
2. Affiche une alerte prioritaire sur le dashboard
3. Code couleur : rouge
4. (Futur) Notification push ou email admin
5. Admin doit agir rapidement : commander ou ajuster manuellement

**Postconditions :**
- Alerte critique visible et traçable

---

#### UC-STOCK-005 : Ajuster le stock manuellement

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Un produit existe

**Flux principal :**
1. Admin accède à `/products` ou `/stock`
2. Sélectionne un produit
3. Clique sur "Ajuster quantité" (pencil icon ou bouton)
4. Le système affiche un dialogue :
   - Quantité actuelle (lecture seule)
   - Raison de l'ajustement (dropdown) : Inventaire, Casse, Retour, Erreur de saisie, Autre
   - Nouvelle quantité (input)
   - Notes (optionnel)
5. Admin saisit la nouvelle quantité
6. Clique sur "Confirmer"
7. Le système :
   - Calcule le delta (ancienne vs nouvelle)
   - Enregistre le mouvement avec timestamp et raison
   - Met à jour la quantité
   - Recalcule les statuts
8. Affiche confirmation "Stock mis à jour"

**Flux alternatif :**
- **Si nouvelle quantité < 0 :** Affiche "Quantité invalide"

**Postconditions :**
- Stock ajusté
- Mouvement tracé (V2 : visible dans l'historique)

---

#### UC-STOCK-006 : Consulter l'historique des mouvements (V2)

**Acteur :** Admin  
**Priorité :** V2  
**Préconditions :**
- Un produit a un historique de mouvements

**Flux principal :**
1. Admin ouvre la fiche produit
2. Clique sur onglet "Historique"
3. Voir une chronologie :
   - Date/heure
   - Type (Vente, Ajustement, Retour, etc.)
   - Quantité (delta)
   - Utilisateur responsable
   - Raison/notes
4. Peut exporter ou imprimer

**Postconditions :**
- Historique affiché avec traçabilité complète

---

### 2.5 Module POS / Caisse

#### UC-POS-001 : Démarrer une vente

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est connecté
- Des produits existent dans le catalogue

**Flux principal :**
1. L'utilisateur accède à `/pos`
2. Le système affiche :
   - Grille produits (avec images et prix)
   - Panier à droite (vide initialement)
   - Champs pour scanner ou recherche
3. Panier affiche :
   - Liste des articles (nom, prix unit, qté, sous-total)
   - Total
4. Boutons d'action : Encaisser, Vider panier, etc.
5. La session de caisse est créée (timestamp, utilisateur)

**Postconditions :**
- Nouvelle session POS ouverte
- Panier vide, prêt pour articles

---

#### UC-POS-002 : Scanner un produit (USB)

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- La session POS est active
- Le lecteur USB est connecté
- Un code-barres valide est scanné

**Flux principal :**
1. L'utilisateur place le focus sur le champ scanner (ou il est actif globalement)
2. Utilise le lecteur USB pour scannner un code-barres sur un article
3. Le scanner émule le clavier, envoie les caractères + Enter
4. Le système :
   - Capture les caractères dans un buffer (100ms de délai)
   - À la réception d'Enter, valide le code-barres complet
   - Cherche le produit correspondant en base
5. Si produit trouvé :
   - L'ajoute au panier (ou incrémente qty si déjà présent)
   - Affiche feedback visuel (flash, son optionnel)
6. Si produit non trouvé :
   - (V1) Ignore silencieusement
   - (V2) Affiche alerte "Produit non trouvé"

**Flux alternatif :**
- **Si focus sur un input text :** Buffer scanner est ignoré (évite les faux positifs)
- **Si code-barres invalide (< 4 chars) :** Ignoré

**Postconditions :**
- Produit ajouté au panier
- Panier mis à jour en temps réel

---

#### UC-POS-003 : Rechercher et ajouter un produit manuellement

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- La session POS est active

**Flux principal :**
1. L'utilisateur voit un champ "Chercher un produit" en haut de la grille
2. Saisit un terme (nom ou code-barres)
3. La grille se filtre en temps réel
4. Clique sur un produit dans la grille
5. Le système ajoute le produit au panier avec qty 1
6. Panier mis à jour, grille réinitialisée

**Postconditions :**
- Produit ajouté au panier

---

#### UC-POS-004 : Modifier la quantité d'un article

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- Un article est dans le panier

**Flux principal :**
1. L'utilisateur voit la ligne de l'article dans le panier
2. Clique sur le bouton "-" ou "+" à côté de la quantité
3. Ou clique directement sur le chiffre pour éditer
4. Modifie la quantité
5. Le système recalcule immédiatement :
   - Sous-total article (prix × qty)
   - Total panier
6. Affiche les montants mis à jour

**Flux alternatif :**
- **Si qty = 0 :** Article retiré du panier automatiquement
- **Si qty > stock disponible :** (V2) Affiche alerte

**Postconditions :**
- Quantité mise à jour
- Total recalculé

---

#### UC-POS-005 : Supprimer un article du panier

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- Un article est dans le panier

**Flux principal :**
1. L'utilisateur clique sur l'icône "X" ou "Supprimer" sur la ligne de l'article
2. L'article est retiré du panier immédiatement
3. Total recalculé

**Postconditions :**
- Article supprimé
- Total mis à jour

---

#### UC-POS-006 : Vider le panier

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- Le panier contient au moins un article

**Flux principal :**
1. L'utilisateur clique sur bouton "Vider panier" (ou "Annuler la vente")
2. Le système demande confirmation : "Êtes-vous sûr ?"
3. Si oui :
   - Vide tous les articles
   - Réinitialise le total
   - Réinitialise les champs de paiement

**Postconditions :**
- Panier vide, session réinitialisée

---

#### UC-POS-007 : Encaisser (passer à la facturation)

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- Le panier contient au moins un article
- Montant total > 0

**Flux principal :**
1. L'utilisateur clique sur bouton "Encaisser"
2. Le système affiche une modal/écran de paiement avec :
   - Récapitulatif du panier (articles et total)
   - Champ "Montant reçu" (input)
   - Boutons montants rapides (500, 1000, 2000, 5000, 10000, 25000, 50000 FCFA)
   - Bouton "Exact" (remplit automatiquement le total)
   - Bouton "Valider"
   - Affichage monnaie (0 initialement)

**Postconditions :**
- Écran de paiement ouvert, prêt pour saisie du montant

---

#### UC-POS-008 : Saisir le montant reçu

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- L'écran de paiement est ouvert

**Flux principal :**
1. L'utilisateur clique dans le champ "Montant reçu"
2. Saisit le montant au clavier
3. Ou clique sur un bouton montant rapide
4. Le système :
   - Valide le format numérique
   - Recalcule la monnaie en temps réel : `Monnaie = Montant reçu - Total`
   - Affiche la monnaie
   - Active/désactive le bouton "Valider" selon le montant

**Flux alternatif :**
- **Si montant < total :** Bouton "Valider" désactivé (grisé)
- **Si montant = 0 :** Affiche monnaie = 0

**Postconditions :**
- Montant reçu saisi
- Monnaie calculée et affichée

---

#### UC-POS-009 : Utiliser un montant rapide

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- L'écran de paiement est ouvert

**Flux principal :**
1. L'utilisateur voit des boutons montants rapides en bas de l'écran :
   - 500 FCFA, 1 000 FCFA, 2 000 FCFA, 5 000 FCFA, 10 000 FCFA, 25 000 FCFA, 50 000 FCFA
2. Clique sur un bouton
3. Le montant est saisi automatiquement dans le champ
4. Monnaie recalculée

**Postconditions :**
- Montant rapide sélectionné
- Monnaie affichée

---

#### UC-POS-010 : Utiliser le montant exact

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- L'écran de paiement est ouvert
- Le panier a un total défini

**Flux principal :**
1. L'utilisateur clique sur bouton "Exact"
2. Le champ "Montant reçu" est rempli automatiquement avec le total du panier
3. Monnaie = 0
4. Bouton "Valider" est activé

**Postconditions :**
- Montant exact rempli
- Prêt pour validation immédiate

---

#### UC-POS-011 : Valider le paiement

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- Montant reçu ≥ Total
- Bouton "Valider" actif

**Flux principal :**
1. L'utilisateur clique sur "Valider"
2. Le système :
   - Crée une facture avec ID unique `FAC-{AAAA}-{NNN}` (année-séquence)
   - Enregistre les détails :
     - Numéro de facture
     - Date et heure précises
     - Articles (nom, prix, qty, sous-total)
     - Total
     - Montant reçu
     - Monnaie rendue
     - Utilisateur (vendeur/admin connecté)
     - Client (optionnel, par défaut "Client comptoir")
   - **Décrémente automatiquement le stock** pour chaque article
   - Recalcule les statuts de stock (Normal/Bas/Critique)
   - Persiste la facture en base de données
   - Persiste les mouvements de stock
3. Affiche l'écran de confirmation avec :
   - Numéro de facture
   - Monnaie à rendre
   - Boutons "Imprimer facture" et "Nouvelle vente"

**Flux alternatif :**
- **Si stock insuffisant :** (V2) Bloque la vente et affiche alerte
- **Si erreur base de données :** Affiche message d'erreur et invite à réessayer

**Postconditions :**
- Vente complète enregistrée
- Stock décrémenté
- Facture créée et stockée
- Prêt pour impression ou nouvelle vente

---

#### UC-POS-012 : Voir la monnaie à rendre

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- La vente est validée

**Flux principal :**
1. L'écran de confirmation affiche clairement la monnaie rendue
2. Format : `Monnaie rendue : 1 500 FCFA` (gros caractères, couleur verte)
3. Visible pour le caissier et le client

**Postconditions :**
- Monnaie affichée et compréhensible

---

#### UC-POS-013 : Imprimer la facture (depuis confirmation)

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- La vente est validée
- Une imprimante thermique est configurée (V1) ou mode impression navigateur

**Flux principal :**
1. L'utilisateur clique sur "Imprimer facture"
2. Le système génère un reçu format 80mm avec :
   - En-tête : Informations entreprise (nom, adresse, téléphone, NIF)
   - N° Facture : `FAC-2026-001`
   - Date et heure : `16/04/2026 14h32m`
   - Client : "Client comptoir" ou nom du client
   - Ligne d'article (x N) :
     ```
     Article 1              10 × 5 000 = 50 000 FCFA
     Article 2               2 × 8 000 = 16 000 FCFA
     ```
   - Sous-total
   - Total TTC (pas de TVA en V1 : TTC = Total)
   - Montant reçu : 70 000 FCFA
   - Monnaie : 4 000 FCFA
   - Pied de page : Merci de votre achat
3. Lance l'impression physique (thermique ou papier 80mm)
4. Optionnel : Sauvegarde un PDF local

**Postconditions :**
- Reçu imprimé, facture archivée

---

#### UC-POS-014 : Démarrer une nouvelle vente

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- Une vente vient d'être validée et imprimée

**Flux principal :**
1. L'utilisateur clique sur "Nouvelle vente" (bouton grand)
2. Le système :
   - Vide le panier
   - Ferme la modal de confirmation
   - Retourne à l'écran POS principal
   - Crée une nouvelle session de caisse
3. Prêt pour scanner/ajouter de nouveaux articles

**Postconditions :**
- Nouvelle session de vente initiée
- Panier vide

---

#### UC-POS-015 : Associer un client à la vente

**Acteur :** Vendeur, Admin  
**Priorité :** V1  
**Préconditions :**
- La session POS est active
- Des clients existent en base

**Flux principal :**
1. L'utilisateur voit un champ "Sélectionner un client" au-dessus du panier
2. Clique sur le champ (dropdown ou modale recherche)
3. Voit la liste des clients ou saisit un terme de recherche
4. Sélectionne un client
5. Affichage du client sur le panier : "Client : John Doe"
6. À la validation de la vente, la facture est liée au client
7. Historique d'achat du client mis à jour

**Flux alternatif :**
- **Si client absent de la liste :** Propose "Ajouter un nouveau client" (voir UC-CLIENTS-001)
- **Si pas de client sélectionné :** Facture libellée "Client comptoir"

**Postconditions :**
- Client associé à la vente
- Facture liée au client après validation

---

### 2.6 Module Factures

#### UC-INVOICES-001 : Consulter l'historique des factures

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est connecté
- Des factures existent

**Flux principal :**
1. L'utilisateur accède à `/invoices`
2. Le système affiche un tableau avec colonnes :
   - N° Facture (FAC-2026-001, etc.)
   - Date/Heure
   - Client (nom ou "Client comptoir")
   - Total (montant)
   - Statut (Payée / Impayée) — V2
   - Actions (Voir, Imprimer, Dupliquer)
3. Trier par date (desc. par défaut)
4. Peut filtrer par date, client, statut

**Postconditions :**
- Liste des factures affichée

---

#### UC-INVOICES-002 : Rechercher une facture

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est sur `/invoices`

**Flux principal :**
1. Voit un champ "Chercher une facture"
2. Saisit un numéro de facture ou un nom client
3. La liste se filtre en temps réel
4. Résultats affichés

**Postconditions :**
- Factures filtrées

---

#### UC-INVOICES-003 : Visualiser le détail d'une facture

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- Une facture existe et est sélectionnée

**Flux principal :**
1. L'utilisateur clique sur une facture dans la liste
2. Le système affiche une modale ou page détail avec :
   - N° Facture
   - Date et heure
   - Client (nom ou "Client comptoir")
   - Tableau des articles :
     - Nom, Prix unitaire, Quantité, Sous-total
   - Total HT (V1 : égal au total)
   - Total TTC (V1 : égal au total, pas de TVA)
   - Montant reçu
   - Monnaie rendue
   - Vendeur (qui a effectué la vente)
3. Boutons : Imprimer, Fermer

**Postconditions :**
- Détail de la facture affiché

---

#### UC-INVOICES-004 : Imprimer une facture

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- Une facture est consultée ou sélectionnée

**Flux principal :**
1. L'utilisateur clique sur "Imprimer facture"
2. Le système génère le même format PDF/thermique que UC-POS-013
3. Affiche la preview
4. L'utilisateur lance l'impression

**Postconditions :**
- Facture réimprimée

---

#### UC-INVOICES-005 : Exporter les factures

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Des factures existent

**Flux principal :**
1. Admin clique sur "Exporter" (en haut de la liste)
2. Choisit le format :
   - CSV (pour Excel/Sheets)
   - PDF (rapport complet)
3. Optionnel : Sélectionne une plage de dates
4. Le système génère et télécharge le fichier
5. Fichier nommé `Factures_2026-04-16.csv`

**Postconditions :**
- Fichier d'export téléchargé

---

#### UC-INVOICES-006 : Marquer une facture comme payée (V2)

**Acteur :** Admin  
**Priorité :** V2  
**Préconditions :**
- Une facture existe avec statut "Impayée"

**Flux principal :**
1. Admin ouvre le détail de la facture
2. Clique sur "Marquer comme payée"
3. Le statut passe à "Payée"
4. Timestamp de paiement enregistré

**Postconditions :**
- Statut facture mis à jour

---

### 2.7 Module Clients

#### UC-CLIENTS-001 : Ajouter un client

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est connecté
- Accès à `/clients` ou formulaire d'ajout rapide au POS

**Flux principal :**
1. Clique sur "Ajouter un client" ou "Nouveau client"
2. Formulaire avec champs :
   - Nom complet (required)
   - Numéro de téléphone (required)
   - Email (optionnel)
   - Adresse (optionnel)
3. Remplit les champs
4. Clique sur "Créer"
5. Client créé avec ID unique, date de création enregistrée

**Postconditions :**
- Client créé et visible dans la liste

---

#### UC-CLIENTS-002 : Rechercher un client

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est sur `/clients` ou formulaire sélection client au POS

**Flux principal :**
1. Voit un champ "Chercher un client"
2. Saisit nom ou numéro de téléphone
3. La liste se filtre en temps réel
4. Clique sur un client pour sélectionner/voir détails

**Postconditions :**
- Client trouvé et sélectionné

---

#### UC-CLIENTS-003 : Consulter la fiche client

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- Un client existe et est sélectionné

**Flux principal :**
1. Affiche la fiche client avec :
   - Nom, téléphone, email, adresse
   - Nombre d'achats (total transactions)
   - Total dépensé (somme de tous les totaux facture)
   - Date du dernier achat
   - Boutons : Modifier, Historique, Supprimer (Admin only)

**Postconditions :**
- Fiche client affichée

---

#### UC-CLIENTS-004 : Modifier un client

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Un client existe

**Flux principal :**
1. Admin ouvre la fiche client
2. Clique sur "Modifier"
3. Formulaire devient éditable
4. Modifie les champs (nom, téléphone, email, adresse)
5. Clique sur "Enregistrer"

**Postconditions :**
- Client mis à jour

---

#### UC-CLIENTS-005 : Supprimer un client

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Un client existe

**Flux principal :**
1. Admin ouvre la fiche client
2. Clique sur "Supprimer"
3. Confirmation : "Êtes-vous sûr ? Les factures historiques seront conservées."
4. Si oui : Client archivé (soft delete)
5. N'apparaît plus dans la sélection client au POS

**Postconditions :**
- Client archivé
- Factures historiques conservées

---

#### UC-CLIENTS-006 : Consulter l'historique d'achat

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- Un client existe

**Flux principal :**
1. Sur la fiche client, clique sur "Historique" ou onglet "Achats"
2. Le système affiche un tableau des factures du client :
   - Date/Heure
   - N° Facture
   - Articles (résumé)
   - Total
3. Peut cliquer sur une facture pour voir le détail

**Postconditions :**
- Historique affiché

---

#### UC-CLIENTS-007 : Gérer les dettes / crédits (V2)

**Acteur :** Admin  
**Priorité :** V2  
**Préconditions :**
- Un client existe
- Module dettes/crédits activé dans Paramètres

**Flux principal :**
1. Admin ouvre la fiche client
2. Voit un onglet "Solde" ou "Dettes/Crédits"
3. Affiche :
   - Solde client (positif = crédit client, négatif = dette)
   - Historique des transactions de crédit
4. Admin peut ajouter un crédit/ajuster le solde
5. Les factures impayées impactent automatiquement le solde

**Postconditions :**
- Solde client géré et tracé

---

### 2.8 Module Utilisateurs

#### UC-USERS-001 : Créer un utilisateur

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Accès à `/users`

**Flux principal :**
1. Admin clique sur "Ajouter un utilisateur"
2. Formulaire avec champs :
   - Nom complet (required)
   - Email (required, unique)
   - Mot de passe (généré ou saisi, min 8 caractères)
   - Rôle (dropdown : Admin ou Vendeur)
3. Admin remplit les champs
4. Clique sur "Créer"
5. Utilisateur créé, un mot de passe temporaire peut être généré et affiché
6. Utilisateur peut se connecter immédiatement

**Postconditions :**
- Nouvel utilisateur créé avec rôle assigné

---

#### UC-USERS-002 : Modifier un utilisateur

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Un utilisateur existe

**Flux principal :**
1. Admin accède à `/users`
2. Clique sur un utilisateur dans la liste
3. Clique sur "Modifier"
4. Formulaire éditable :
   - Nom (modifiable)
   - Email (modifiable si unique)
   - Rôle (modifiable)
5. Admin modifie les champs
6. Clique sur "Enregistrer"

**Postconditions :**
- Utilisateur mis à jour

---

#### UC-USERS-003 : Activer / Désactiver un compte

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Un utilisateur existe

**Flux principal :**
1. Admin accède à `/users`
2. Voit un toggle "Actif / Inactif" sur chaque utilisateur
3. Admin clique sur le toggle
4. Compte passé à "Inactif"
5. L'utilisateur ne peut plus se connecter
6. Les données historiques (ventes) restent visibles

**Postconditions :**
- Compte désactivé sans supprimer les données

---

#### UC-USERS-004 : Supprimer un utilisateur

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Un utilisateur existe

**Flux principal :**
1. Admin ouvre la fiche utilisateur
2. Clique sur "Supprimer"
3. Confirmation : "Êtes-vous sûr ? Les données historiques seront conservées."
4. Si oui : Utilisateur archivé (soft delete)
5. N'apparaît plus dans la liste utilisateurs

**Postconditions :**
- Utilisateur archivé
- Historique ventes conservé

---

#### UC-USERS-005 : Consulter les connexions

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Des utilisateurs ont établi des connexions

**Flux principal :**
1. Admin accède à `/users`
2. Chaque utilisateur affiche :
   - Dernière connexion (date + heure)
   - Nombre de connexions (optionnel)
   - Dernier appareil/IP (optionnel, V2)
3. Admin peut trier par dernière connexion

**Postconditions :**
- Activité utilisateurs visible

---

#### UC-USERS-006 : Voir les ventes par utilisateur

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Des ventes ont été effectuées
- Admin accède à `/users`

**Flux principal :**
1. Admin clique sur un utilisateur ou voir un onglet "Ventes"
2. Affiche un tableau des ventes du vendeur :
   - Date/Heure
   - N° Facture
   - Client
   - Total
   - Montant reçu
3. Peut voir le total des ventes du jour/semaine/mois

**Postconditions :**
- Ventes du vendeur affichées avec traçabilité

---

#### UC-USERS-007 : Réinitialiser mot de passe d'un utilisateur (V2)

**Acteur :** Admin  
**Priorité :** V2  
**Préconditions :**
- Admin est connecté
- Un utilisateur existe

**Flux principal :**
1. Admin ouvre la fiche utilisateur
2. Clique sur "Réinitialiser mot de passe"
3. Un mot de passe temporaire est généré
4. Admin peut le copier et le transmettre au vendeur
5. (Futur) Envoyer par email

**Postconditions :**
- Mot de passe réinitialisé

---

### 2.9 Module Rapports

#### UC-REPORTS-001 : Consulter les ventes du jour

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Le dashboard est affiché

**Flux principal :**
1. Admin accède au Dashboard ou `/reports`
2. Voit les KPIs du jour :
   - Total ventes (somme de toutes les factures du jour)
   - Nombre de transactions
   - Nombre de clients servis
   - Ticket moyen (total / nombre transactions)
3. Peut voir la liste des ventes du jour avec détails

**Postconditions :**
- Ventes du jour affichées

---

#### UC-REPORTS-002 : Consulter l'historique des ventes

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Des ventes existent

**Flux principal :**
1. Admin accède à `/reports`
2. Voit une section "Historique des ventes"
3. Choisit une plage de dates (jour, semaine, mois) via controls
4. Le système affiche :
   - Graphe en barres : ventes par jour/semaine/mois
   - Total cumulé
   - Tendance (↑ ↓)
   - Tableau détaillé des transactions

**Postconditions :**
- Historique des ventes affichée avec visualisation

---

#### UC-REPORTS-003 : Suivre l'activité à distance

**Acteur :** Admin (Client X)  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- L'application est accessible (cloud ou VPN)

**Flux principal :**
1. Admin se connecte depuis un appareil mobile ou ordinateur distant
2. Accède au Dashboard et Rapports
3. Voit en temps réel :
   - Ventes du jour (actualisé)
   - Alertes stock
   - Activité vendeurs
4. (Futur) Notifications push en cas d'alerte

**Postconditions :**
- Activité magasin visible à distance

---

#### UC-REPORTS-004 : Identifier les produits les plus vendus (V2)

**Acteur :** Admin  
**Priorité :** V2  
**Préconditions :**
- Des ventes existent

**Flux principal :**
1. Admin accède à `/reports`
2. Voit une section "Top produits"
3. Classement par :
   - Quantité vendue (nb articles)
   - Chiffre d'affaires généré (montant)
4. Affiche un graphe ou tableau avec top 10 produits
5. Peut filtrer par période

**Postconditions :**
- Top produits visible pour analyse

---

#### UC-REPORTS-005 : Exporter un rapport (V2)

**Acteur :** Admin  
**Priorité :** V2  
**Préconditions :**
- Admin consulte un rapport

**Flux principal :**
1. Admin clique sur "Exporter"
2. Choisit le format (CSV ou PDF)
3. Le système génère le fichier avec toutes les données du rapport
4. Télécharge le fichier

**Postconditions :**
- Rapport exporté

---

#### UC-REPORTS-006 : Statistiques avancées (V2)

**Acteur :** Admin  
**Priorité :** V2  
**Préconditions :**
- Des données suffisantes existent

**Flux principal :**
1. Admin accède à une section "Statistiques avancées"
2. Voit :
   - Courbes de tendance ventes (trend line)
   - Analyse par catégorie de produits
   - Marges bénéficiaires (prix vente vs prix achat)
   - Moyenne de ventes par vendeur
   - Heure de pointe (rush hours)

**Postconditions :**
- Analyses avancées disponibles

---

### 2.10 Module Paramètres / Apparence

#### UC-SETTINGS-001 : Configurer les informations de la boutique

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Accès à `/settings`

**Flux principal :**
1. Admin clique sur "Informations de la boutique"
2. Formulaire avec champs :
   - Nom de la boutique (required)
   - Adresse complète
   - Téléphone
   - Email
   - NIF (numéro identifiant fiscal)
   - Logo (upload image)
3. Admin remplit/modifie les champs
4. Clique sur "Enregistrer"
5. Les informations apparaissent sur les factures imprimées et le dashboard

**Postconditions :**
- Informations boutique mises à jour

---

#### UC-SETTINGS-002 : Gérer les catégories de produits

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Module Paramètres accessible

**Flux principal :**
1. Admin clique sur "Catégories"
2. Voit la liste des catégories actuelles (Alimentaire, Boissons, Hygiène, etc.)
3. Peut :
   - Ajouter une catégorie : Clique "Nouvelle catégorie", saisit le nom
   - Modifier : Clique sur une catégorie, édite le nom
   - Supprimer : Clique sur la poubelle (soft delete)
4. Enregistre les modifications

**Postconditions :**
- Catégories mises à jour
- Affichées immédiatement dans les filtres produits et POS

---

#### UC-SETTINGS-003 : Configurer les montants rapides du POS

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté

**Flux principal :**
1. Admin clique sur "Montants rapides POS"
2. Voit une liste des montants prédéfinis (500, 1000, 2000, 5000, 10000, 25000, 50000 FCFA)
3. Peut :
   - Ajouter un montant : Clique "Ajouter", saisit le montant
   - Modifier : Double-clique pour éditer
   - Supprimer : Clique sur la poubelle
4. Enregistre
5. Les nouveaux montants apparaissent au POS

**Postconditions :**
- Montants rapides personnalisés

---

#### UC-SETTINGS-004 : Configurer l'en-tête de facture

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté

**Flux principal :**
1. Admin clique sur "Format facture"
2. Voit des champs éditables :
   - En-tête personnalisé (texte libre, ex: "Merci de votre achat!")
   - Pied de page (texte)
   - Logo visible sur facture (checkbox)
   - Format papier (80mm ou A4)
3. Admin modifie et clique "Aperçu" pour voir le résultat
4. Clique "Enregistrer"
5. Toutes les futures factures utilisent ce format

**Postconditions :**
- Format facture personnalisé

---

#### UC-SETTINGS-005 : Installer la PWA

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est connecté
- Utilise un navigateur supportant PWA (Chrome, Edge, Firefox)

**Flux principal :**
1. Le navigateur affiche une bannière "Installer l'application"
2. L'utilisateur clique sur "Installer"
3. Le navigateur propose d'ajouter un raccourci à l'écran d'accueil
4. L'utilisateur confirme
5. L'application est ajoutée en tant que PWA native
6. Peut être lancée comme une application sans passer par le navigateur

**Postconditions :**
- PWA installée sur l'écran d'accueil

---

### 2.11 Module Profil Utilisateur

#### UC-PROFILE-001 : Consulter et modifier son profil

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est connecté

**Flux principal :**
1. L'utilisateur clique sur son avatar/nom en haut à droite
2. Menu déroulant : "Mon profil"
3. Affiche la page de profil avec :
   - Nom
   - Email
   - Rôle (lecture seule)
   - Date d'inscription
   - Bouton "Modifier mot de passe"
4. L'utilisateur peut modifier son nom et email
5. Clique "Enregistrer"

**Postconditions :**
- Profil mis à jour

---

#### UC-PROFILE-002 : Modifier son mot de passe

**Acteur :** Admin, Vendeur  
**Priorité :** V1  
**Préconditions :**
- L'utilisateur est connecté

**Flux principal :**
1. L'utilisateur clique sur "Modifier mot de passe"
2. Formulaire avec :
   - Mot de passe actuel (required)
   - Nouveau mot de passe (required)
   - Confirmer nouveau mot de passe
3. Remplit les champs
4. Clique "Enregistrer"
5. Le système valide l'ancien mot de passe
6. Hash le nouveau et le persiste
7. Affiche "Mot de passe modifié avec succès"

**Postconditions :**
- Mot de passe de l'utilisateur changé

---

### 2.12 Module Codes-barres (V1)

#### UC-BARCODE-001 : Imprimer des étiquettes code-barres en lot

**Acteur :** Admin  
**Priorité :** V1 (simplifiée) / V2 (avancée)  
**Préconditions :**
- Admin est connecté
- Des produits existent

**Flux principal :**
1. Admin accède à `/products` et sélectionne plusieurs produits (checkbox)
2. Clique sur "Imprimer codes-barres" (action groupée)
3. Le système génère un PDF multi-page avec :
   - Les codes-barres de tous les produits sélectionnés
   - Disposition : 4x6 ou configurable par page A4
4. Ouvre la preview PDF
5. Admin lance l'impression

**Postconditions :**
- Feuille d'étiquettes imprimée

---

### 2.13 Module Notifications (V1 minimaliste, V2 avancé)

#### UC-NOTIF-001 : Recevoir des alertes stock bas/critique

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Un produit atteint le seuil d'alerte

**Flux principal :**
1. Le système détecte automatiquement les produits en alerte
2. Affiche une notification visuelle sur le dashboard (section "Alertes")
3. (V2) Notification push sur mobile si PWA installée
4. (V2) Email optionnel si configuré

**Postconditions :**
- Alerte visible et traçable

---

### 2.14 Module Admin (Vue globale, logs)

#### UC-ADMIN-001 : Accéder à une vue globale de l'activité

**Acteur :** Admin  
**Priorité :** V1  
**Préconditions :**
- Admin est connecté
- Accès au Dashboard

**Flux principal :**
1. Admin accède au Dashboard
2. Voit un aperçu global :
   - KPIs du jour
   - Alertes stock
   - Ventes récentes
   - Activité vendeurs (qui a vendu quoi, quand)
   - Statut boutique (produits, utilisateurs, etc.)

**Postconditions :**
- Vue d'ensemble visible

---

#### UC-ADMIN-002 : Consulter les logs d'activité

**Acteur :** Admin  
**Priorité :** V2  
**Préconditions :**
- Admin est connecté
- Des activités ont été enregistrées

**Flux principal :**
1. Admin accède à une section "Logs" (optionnel, dans Paramètres ou Dashboard)
2. Voit un journal chronologique des actions :
   - Connexions / déconnexions
   - Création/modification/suppression de produits
   - Ventes (qui, quand, montant)
   - Ajustements de stock
   - Créations d'utilisateurs
3. Peut filtrer par type d'action, utilisateur, date
4. Exporter les logs (V2)

**Postconditions :**
- Logs affichés avec traçabilité complète

---

## 3. Règles métier principales

### 3.1 Gestion du stock

| Règle | Détail |
|-------|--------|
| **Statut critique** | Quantité ≤ (Stock minimum × 0.5) → Rouge |
| **Statut bas** | Quantité ≤ Stock minimum ET > (Stock minimum × 0.5) → Orange |
| **Statut normal** | Quantité > Stock minimum → Vert |
| **Décrémentation auto** | Chaque vente valide décrémente le stock du panier |
| **Stock minimum requis** | Chaque produit doit avoir un minimum pour les alertes |
| **Vente sans stock** | V1 : Pas bloquée | V2 : À définir (blocage possible) |

### 3.2 Calcul monnaie (POS)

| Règle | Détail |
|-------|--------|
| **Formule** | Monnaie = Montant reçu − Total panier |
| **Validation** | Bouton "Valider" actif seulement si Montant ≥ Total |
| **Montant exact** | Bouton "Exact" remplit automatiquement = Total |
| **Montants rapides** | 500, 1 000, 2 000, 5 000, 10 000, 25 000, 50 000 FCFA |
| **Format** | Nombres entiers, pas de centimes (FCFA arrondi) |
| **Monnaie jamais négative** | `Math.max(0, montantReçu - total)` |

### 3.3 Numérotation factures

| Règle | Détail |
|-------|--------|
| **Format** | `FAC-{AAAA}-{NNN}` (ex: FAC-2026-001) |
| **Séquence** | Numéro réinitialisé à 001 le 1er janvier |
| **Unicité** | Chaque facture a un ID unique non réutilisable |
| **Client comptoir** | Si aucun client : facture libellée "Client comptoir" |

### 3.4 Scanner code-barres

| Règle | Détail |
|-------|--------|
| **Émulation clavier** | Scanner USB se comporte comme un clavier |
| **Buffer 100ms** | Distingue entrée humaine vs scanner |
| **Longueur min** | 4 caractères + Entrée = code valide |
| **Conflit recherche** | Si focus sur input recherche : buffer ignoré |
| **Produit non trouvé** | V1 : Silencieusement ignoré | V2 : Alerte |

### 3.5 Rôles et permissions

| Rôle | Modules | Détail |
|------|---------|--------|
| **Admin** | Tous | Accès complet |
| **Vendeur** | POS, Produits (R), Stock (R), Clients (CR), Factures (R) | Accès limité |

### 3.6 Images produits

| Règle | Détail |
|-------|--------|
| **Sources** | Appareil photo (camera) ou upload fichier |
| **Fallback** | Emoji générique si pas d'image |
| **Compression** | Max 2MB, redimensionne à 800x600px |

### 3.7 PWA

| Règle | Détail |
|-------|--------|
| **Installation** | Installable via "Ajouter à l'écran d'accueil" |
| **Mode hors-ligne** | V1 : Non disponible (connexion requise) |
| **Accès à distance** | Admin peut se connecter de n'importe où |

---

## 4. Matrice des permissions

| Module | Admin | Vendeur |
|--------|-------|---------|
| Dashboard | Lecture | Lecture |
| Produits | CRUD | Lecture |
| Stock | Lecture + ajustement | Lecture |
| POS/Caisse | Vente complète | Vente complète |
| Factures | CRUD + export | Lecture + impression |
| Clients | CRUD + historique | Créer + consulter |
| Utilisateurs | CRUD | Pas d'accès |
| Rapports | Complet | Pas d'accès |
| Paramètres | Complet | Pas d'accès |
| Profil | Modification | Modification |

---

## 5. Flux critiques résumés

### 5.1 Flux vente complet (POS)

```
1. Démarrer une vente (UC-POS-001)
2. Scanner produit (UC-POS-002) x N
3. Modifier quantités (UC-POS-004)
4. Encaisser (UC-POS-007)
5. Saisir montant reçu (UC-POS-008)
6. Valider paiement (UC-POS-011)
   → Facture créée
   → Stock décrémenté
   → Monnaie affichée
7. Imprimer facture (UC-POS-013)
8. Nouvelle vente (UC-POS-014)
```

### 5.2 Flux gestion produits

```
1. Ajouter produit (UC-PROD-001)
2. Ajouter image (UC-PROD-005)
3. Générer code-barres (UC-PROD-006)
4. Imprimer étiquettes (UC-PROD-007)
5. Produit visible au POS
```

### 5.3 Flux alertes stock

```
1. Produit atteint seuil minimum
2. Statut = "Bas" ou "Critique"
3. Alerte visible sur Dashboard
4. Admin ajuste stock (UC-STOCK-005) ou commande
```

---

## 6. Évolutions planifiées (V2)

| Use Case | Priorité | Module |
|----------|----------|--------|
| UC-AUTH-004 : Réinitialiser mot de passe | V2 | Authentification |
| UC-INVOICES-006 : Marquer facture payée | V2 | Factures |
| UC-CLIENTS-007 : Gérer dettes/crédits | V2 | Clients |
| UC-USERS-007 : Réinitialiser mot de passe | V2 | Utilisateurs |
| UC-REPORTS-004 : Top produits | V2 | Rapports |
| UC-REPORTS-005 : Exporter rapport | V2 | Rapports |
| UC-REPORTS-006 : Statistiques avancées | V2 | Rapports |
| UC-ADMIN-002 : Logs d'activité | V2 | Admin |
| UC-STOCK-006 : Historique mouvements | V2 | Stock |
| UC-BARCODE-001 : Impression étiquettes en lot | V2 | Codes-barres |

---

*Document généré le 16/04/2026 — NAOSERVICES × MPJ HIGH-TECH*
*Version V1 — Comprend 40+ cas d'usage détaillés pour la spécification backend*
