# NAOSERVICES INVENTORY — Architecture Backend

> Document de référence technique pour la connexion du frontend React/Vite/TypeScript existant à un backend Django + Supabase.  
> Monnaie : FCFA — Interface : français — Cible : PWA multi-device (mobile, tablette, PC)

---

## 1. Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (PWA)                            │
│                                                                 │
│   React 18 + Vite + TypeScript                                  │
│   TanStack Query  ←→  Zustand/Context                           │
│   react-router-dom v6  +  shadcn/ui                             │
│                                                                 │
│   Déployé sur : Vercel (CDN mondial)                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS  /api/v1/…
                           │ JWT Bearer token (Authorization header)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DJANGO REST API                            │
│                                                                 │
│   Django 5 + Django REST Framework                              │
│   djangorestframework-simplejwt  (tokens JWT)                   │
│   django-cors-headers                                           │
│   Gunicorn + Nginx (prod)                                       │
│                                                                 │
│   Déployé sur : Docker (VPS ou Railway/Render)                  │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
               │ django-supabase /         │ Supabase Storage SDK
               │ psycopg2 (PostgreSQL)     │ (images produits)
               ▼                          ▼
┌──────────────────────────┐  ┌───────────────────────────────────┐
│     SUPABASE              │  │     SUPABASE STORAGE              │
│                          │  │                                   │
│  PostgreSQL (base)        │  │  Bucket : product-images          │
│  Supabase Auth (JWT)      │  │  Accès public (URLs signées)      │
│  Row Level Security       │  │  Upload direct depuis Django      │
│  Realtime (WebSocket)     │  │  ou pré-signé depuis le client    │
└──────────────────────────┘  └───────────────────────────────────┘
```

### Flux d'une requête typique (vente POS)

```
PosPage.tsx
  → useMutation (TanStack Query)
    → POST /api/v1/sales/
      → SaleViewSet.create() [Django]
        → Valide panier + stock disponible
        → Crée Sale + SaleItem (PostgreSQL via Supabase)
        → Décrémente stock produit
        → Génère numéro facture
        → Retourne Sale + Invoice
      ← 201 Created { sale, invoice }
    ← mise à jour cache TanStack Query
  ← UI rafraîchit stock + historique
```

---

## 2. Choix techniques justifiés

### Django (API backend)

| Argument | Détail |
|----------|--------|
| **ORM puissant** | Modèles Python ↔ PostgreSQL, migrations automatiques |
| **DRF mature** | ViewSets, Serializers, filtres, pagination prêts à l'emploi |
| **Sécurité intégrée** | CSRF, SQL injection prevention, input validation |
| **Admin Django** | Interface d'administration gratuite pour le client admin |
| **Ecosystem riche** | PDF (WeasyPrint/ReportLab), barcode (python-barcode), JWT |
| **Python** | Large communauté, facilité de maintenance long terme |

**Alternative écartée — FastAPI** : plus rapide mais moins de batteries incluses (pas d'admin, ORM externe, setup plus long pour une V1).

### Supabase (base de données + auth + storage)

| Argument | Détail |
|----------|--------|
| **PostgreSQL managé** | Pas de serveur DB à gérer, backups automatiques |
| **Supabase Auth** | Gestion utilisateurs, tokens JWT, refresh tokens inclus |
| **Row Level Security** | Isolation des données par rôle au niveau DB |
| **Storage intégré** | Upload d'images produits sans S3 séparé |
| **Dashboard** | Visualisation des données en temps réel pour le client |
| **Realtime** | WebSocket natif (utile pour suivi ventes à distance V1) |
| **Tier gratuit généreux** | 500 MB DB, 1 GB storage, 50k auth users |

**Alternative écartée — Firebase** : NoSQL inadapté aux relations stock/ventes/factures, coût plus élevé à l'échelle.

### Vercel (déploiement frontend)

| Argument | Détail |
|----------|--------|
| **Zero config** | Détecte Vite automatiquement |
| **CDN global** | Latence réduite même depuis le Gabon |
| **Preview deployments** | Chaque PR = URL de preview |
| **Variables d'env** | Gestion sécurisée des clés |
| **Tier gratuit** | Suffisant pour V1 |

### Docker (backend en production)

| Argument | Détail |
|----------|--------|
| **Reproductibilité** | Même environment dev/staging/prod |
| **Portabilité** | VPS, Railway, Render, Fly.io — pas de vendor lock-in |
| **Gestion dépendances** | Python packages isolés |
| **Scaling** | Facile à scaler horizontalement si besoin |

---

## 3. Structure du projet Django (multi-apps)

### Arborescence du projet

```
inventory_backend/          # Projet Django racine
├── config/                 # Settings, URLs racine, WSGI/ASGI
│   ├── settings/
│   │   ├── base.py         # Config commune (DB, apps installées, DRF, JWT)
│   │   ├── development.py  # DEBUG=True, CORS ouvert, logs verbeux
│   │   └── production.py   # DEBUG=False, ALLOWED_HOSTS, sécurité renforcée
│   ├── urls.py             # Routage racine → inclut les URLs de chaque app
│   └── wsgi.py
├── apps/
│   ├── authentication/     # Auth, JWT, rôles (Admin/Vendeur)
│   ├── products/           # Catalogue produits, images, codes-barres
│   ├── stock/              # Niveaux stock, mouvements, alertes
│   ├── sales/              # Ventes, lignes de vente, POS
│   ├── invoices/           # Génération factures, PDF
│   ├── clients/            # Base clients, historique achats
│   ├── users/              # Comptes utilisateurs, permissions
│   ├── reports/            # Agrégations, statistiques, KPIs
│   └── settings_app/       # Config entreprise, catégories, paramètres caisse
├── core/
│   ├── permissions.py      # IsAdmin, IsAdminOrVendeur
│   ├── pagination.py       # StandardResultsPagination
│   ├── middleware.py       # JWT Supabase middleware
│   └── storage.py          # Client Supabase Storage
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── Dockerfile
├── docker-compose.yml
└── manage.py
```

### Principe de découpage

Chaque `app` Django est **responsable d'un seul domaine métier**. Les dépendances inter-apps se font uniquement via imports explicites des modèles ou des serializers concernés — jamais via un import circulaire. Les signaux Django (`post_save`) assurent la communication asynchrone entre apps (ex : une vente validée déclenche la mise à jour du stock et la création de la facture).

```
config/urls.py
  ├── /api/v1/auth/       → apps.authentication.urls
  ├── /api/v1/products/   → apps.products.urls
  ├── /api/v1/stock/      → apps.stock.urls
  ├── /api/v1/sales/      → apps.sales.urls
  ├── /api/v1/invoices/   → apps.invoices.urls
  ├── /api/v1/clients/    → apps.clients.urls
  ├── /api/v1/users/      → apps.users.urls
  ├── /api/v1/reports/    → apps.reports.urls
  └── /api/v1/settings/   → apps.settings_app.urls
```

---

## 3a. Détail des apps Django

### App : `authentication`

**Responsabilité** : Authentification JWT via Supabase Auth, gestion des tokens, profil utilisateur connecté.

#### Modèles

```python
# apps/authentication/models.py
class UserProfile(models.Model):
    """Profil Django lié à un compte Supabase Auth (même UUID)."""
    id          = models.UUIDField(primary_key=True)  # = supabase auth.users.id
    email       = models.EmailField(unique=True)
    full_name   = models.CharField(max_length=150)
    role        = models.CharField(
                    max_length=20,
                    choices=[('admin', 'Admin'), ('vendeur', 'Vendeur')],
                    default='vendeur'
                  )
    is_active   = models.BooleanField(default=True)
    last_login  = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
```

#### Endpoints

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `POST` | `/auth/login/` | Connexion — retourne access + refresh token | Public |
| `POST` | `/auth/refresh/` | Renouvelle l'access token via refresh token | Public |
| `POST` | `/auth/logout/` | Blackliste le refresh token | Authentifié |
| `GET` | `/auth/me/` | Profil de l'utilisateur connecté | Authentifié |
| `PATCH` | `/auth/me/` | Mise à jour nom, mot de passe | Authentifié |

#### Relations inter-apps

- Importée par toutes les apps via `from apps.authentication.models import UserProfile` pour les champs `created_by` / `seller`.

---

### App : `products`

**Responsabilité** : Catalogue produits, gestion des images via Supabase Storage, génération et lookup de codes-barres.

#### Modèles

```python
# apps/products/models.py
class Category(models.Model):
    id    = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name  = models.CharField(max_length=100, unique=True)
    order = models.IntegerField(default=0)

class Product(models.Model):
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name          = models.CharField(max_length=255)
    barcode       = models.CharField(max_length=100, unique=True, blank=True)
    price         = models.DecimalField(max_digits=12, decimal_places=0)  # FCFA entier
    cost_price    = models.DecimalField(max_digits=12, decimal_places=0, null=True, blank=True)
    category      = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    description   = models.TextField(blank=True)
    image_url     = models.URLField(blank=True)      # URL publique Supabase Storage
    image_path    = models.CharField(max_length=500, blank=True)  # chemin dans le bucket
    is_active     = models.BooleanField(default=True)
    created_by    = models.ForeignKey('authentication.UserProfile', on_delete=models.SET_NULL, null=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
```

#### Endpoints

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/products/` | Liste paginée — `?search=` `?category=` | Admin, Vendeur |
| `POST` | `/products/` | Créer un produit | Admin |
| `GET` | `/products/{id}/` | Détail produit | Admin, Vendeur |
| `PUT` | `/products/{id}/` | Mise à jour complète | Admin |
| `PATCH` | `/products/{id}/` | Mise à jour partielle | Admin |
| `DELETE` | `/products/{id}/` | Soft delete (`is_active=False`) | Admin |
| `GET` | `/products/barcode/{code}/` | Lookup par code-barres (POS scanner) | Admin, Vendeur |
| `POST` | `/products/{id}/upload-image/` | Upload image → Supabase Storage | Admin |
| `POST` | `/products/{id}/generate-barcode/` | Génère un code-barres unique | Admin |

#### Relations inter-apps

- `stock` importe `Product` pour les mouvements de stock.
- `sales` importe `Product` pour les lignes de vente (snapshot prix/nom).

---

### App : `stock`

**Responsabilité** : Niveaux de stock par produit, mouvements (entrée/sortie/ajustement), alertes bas/critique.

#### Modèles

```python
# apps/stock/models.py
class StockLevel(models.Model):
    """Niveau de stock actuel par produit (table dénormalisée pour performance)."""
    product   = models.OneToOneField('products.Product', on_delete=models.CASCADE, related_name='stock')
    qty       = models.IntegerField(default=0)
    qty_min   = models.IntegerField(default=5)   # seuil alerte bas
    qty_max   = models.IntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def status(self):
        if self.qty <= self.qty_min * 0.5:
            return 'critical'
        if self.qty <= self.qty_min:
            return 'low'
        return 'normal'

class StockMovement(models.Model):
    MOVEMENT_TYPES = [
        ('in', 'Entrée'),
        ('out', 'Sortie vente'),
        ('adjustment', 'Ajustement'),
        ('return', 'Retour'),
    ]
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4)
    product       = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='movements')
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPES)
    quantity      = models.IntegerField()        # positif = entrée, négatif = sortie
    qty_before    = models.IntegerField()
    qty_after     = models.IntegerField()
    reference     = models.CharField(max_length=100, blank=True)  # ex: numéro vente
    note          = models.TextField(blank=True)
    created_by    = models.ForeignKey('authentication.UserProfile', on_delete=models.SET_NULL, null=True)
    created_at    = models.DateTimeField(auto_now_add=True)
```

#### Endpoints

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/stock/` | Vue stock tous produits (qty, statut) | Admin, Vendeur |
| `POST` | `/stock/movements/` | Entrée stock manuelle (livraison, ajustement) | Admin |
| `GET` | `/stock/movements/` | Historique mouvements — `?product=` `?type=` | Admin |
| `GET` | `/stock/alerts/` | Produits en stock bas ou critique | Admin, Vendeur |

#### Relations inter-apps

- Signal `post_save` sur `apps.sales.Sale` déclenche la mise à jour du `StockLevel` et crée un `StockMovement` de type `out`.
- Importé par `reports` pour les agrégations stock.

---

### App : `sales`

**Responsabilité** : Enregistrement des ventes POS, lignes de vente, gestion du panier et de l'annulation.

#### Modèles

```python
# apps/sales/models.py
class Sale(models.Model):
    STATUS_CHOICES = [
        ('completed', 'Terminée'),
        ('cancelled', 'Annulée'),
        ('refunded', 'Remboursée'),
    ]
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sale_number    = models.CharField(max_length=30, unique=True)  # ex: VTE-20260416-0001
    client         = models.ForeignKey('clients.Client', on_delete=models.SET_NULL, null=True, blank=True)
    seller         = models.ForeignKey('authentication.UserProfile', on_delete=models.SET_NULL, null=True)
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    subtotal       = models.DecimalField(max_digits=14, decimal_places=0)
    discount       = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    total_amount   = models.DecimalField(max_digits=14, decimal_places=0)
    amount_paid    = models.DecimalField(max_digits=14, decimal_places=0)
    change_given   = models.DecimalField(max_digits=14, decimal_places=0)
    payment_method = models.CharField(max_length=30, default='cash')  # cash, mobile_money
    note           = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

class SaleItem(models.Model):
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4)
    sale         = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product      = models.ForeignKey('products.Product', on_delete=models.PROTECT)
    product_name = models.CharField(max_length=255)  # snapshot nom au moment de la vente
    unit_price   = models.DecimalField(max_digits=12, decimal_places=0)  # snapshot prix
    quantity     = models.IntegerField()
    total_price  = models.DecimalField(max_digits=14, decimal_places=0)
```

#### Endpoints

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/sales/` | Historique ventes — `?date_from=` `?date_to=` `?seller=` | Admin |
| `POST` | `/sales/` | Créer une vente (POS) — décrémente stock + génère facture | Admin, Vendeur |
| `GET` | `/sales/{id}/` | Détail vente avec items | Admin, Vendeur |
| `PATCH` | `/sales/{id}/cancel/` | Annuler une vente (remet le stock) | Admin |
| `GET` | `/sales/today/` | Résumé journalier (total, nb ventes, CA) | Admin, Vendeur |

**Payload POST /sales/**
```json
{
  "client_id": "uuid-or-null",
  "items": [
    { "product_id": "uuid", "quantity": 3 },
    { "product_id": "uuid", "quantity": 1 }
  ],
  "amount_paid": 5000,
  "payment_method": "cash",
  "discount": 0
}
```

#### Relations inter-apps

- `post_save` sur `Sale` → signal vers `stock` (décrémentation) et `invoices` (création facture auto).
- Importe `clients.Client` et `products.Product`.
- Importé par `reports` pour les agrégations ventes.

---

### App : `invoices`

**Responsabilité** : Génération automatique de factures, export PDF, archivage dans Supabase Storage.

#### Modèles

```python
# apps/invoices/models.py
class Invoice(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    invoice_number  = models.CharField(max_length=30, unique=True)  # ex: FAC-2026-001
    sale            = models.OneToOneField('sales.Sale', on_delete=models.CASCADE, related_name='invoice')
    client          = models.ForeignKey('clients.Client', on_delete=models.SET_NULL, null=True, blank=True)
    # Snapshots config entreprise au moment de la vente
    company_name    = models.CharField(max_length=255)
    company_address = models.TextField(blank=True)
    company_phone   = models.CharField(max_length=30, blank=True)
    company_nif     = models.CharField(max_length=50, blank=True)
    # PDF généré
    pdf_url         = models.URLField(blank=True)   # URL Supabase Storage
    pdf_path        = models.CharField(max_length=500, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
```

#### Endpoints

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/invoices/` | Liste factures paginée | Admin, Vendeur |
| `GET` | `/invoices/{id}/` | Détail facture | Admin, Vendeur |
| `GET` | `/invoices/{id}/pdf/` | Télécharge / génère le PDF (WeasyPrint) | Admin, Vendeur |
| `GET` | `/invoices/sale/{sale_id}/` | Facture d'une vente spécifique | Admin, Vendeur |

#### Relations inter-apps

- Reçoit un signal `post_save` depuis `sales.Sale` pour créer automatiquement la facture.
- Importe `settings_app.CompanySettings` pour le snapshot des infos entreprise.

---

### App : `clients`

**Responsabilité** : Base de données clients, historique des achats, statistiques par client.

#### Modèles

```python
# apps/clients/models.py
class Client(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name       = models.CharField(max_length=255)
    phone      = models.CharField(max_length=30, blank=True)
    email      = models.EmailField(blank=True)
    address    = models.TextField(blank=True)
    note       = models.TextField(blank=True)
    created_by = models.ForeignKey('authentication.UserProfile', on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

#### Endpoints

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/clients/` | Liste clients — `?search=` | Admin, Vendeur |
| `POST` | `/clients/` | Créer un client | Admin, Vendeur |
| `GET` | `/clients/{id}/` | Détail client (profil + stats achats) | Admin, Vendeur |
| `PUT` | `/clients/{id}/` | Mise à jour client | Admin, Vendeur |
| `DELETE` | `/clients/{id}/` | Supprimer client | Admin |
| `GET` | `/clients/{id}/sales/` | Historique achats du client | Admin, Vendeur |

#### Relations inter-apps

- Importé par `sales` et `invoices` via FK.

---

### App : `users`

**Responsabilité** : Gestion des comptes utilisateurs (CRUD admin), activation/désactivation, consultation des ventes par vendeur.

> Note : `UserProfile` est défini dans l'app `authentication`. L'app `users` expose les endpoints de gestion admin sans redéfinir le modèle.

#### Endpoints

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/users/` | Liste utilisateurs | Admin |
| `POST` | `/users/` | Créer un compte vendeur/admin | Admin |
| `GET` | `/users/{id}/` | Détail utilisateur | Admin |
| `PATCH` | `/users/{id}/` | Modifier rôle, statut actif | Admin |
| `DELETE` | `/users/{id}/` | Désactiver compte (soft delete) | Admin |
| `GET` | `/users/{id}/sales/` | Ventes réalisées par cet utilisateur | Admin |

#### Relations inter-apps

- Importe `authentication.UserProfile` pour les opérations CRUD.
- Crée/désactive simultanément l'utilisateur dans Supabase Auth (via `supabase-py`).

---

### App : `reports`

**Responsabilité** : Agrégations SQL, KPIs du tableau de bord, statistiques de ventes, classements produits.

> Cette app ne contient **aucun modèle propre**. Elle expose des vues en lecture seule construites avec des agrégations sur les modèles des autres apps.

#### Endpoints

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/reports/dashboard/` | KPIs du jour (CA, nb ventes, alertes stock) | Admin |
| `GET` | `/reports/sales-by-day/` | CA par jour — `?days=7` (défaut 7) | Admin |
| `GET` | `/reports/top-products/` | Top produits vendus — `?limit=10` | Admin |
| `GET` | `/reports/stock-summary/` | Résumé stock par catégorie | Admin |
| `GET` | `/reports/sales-by-seller/` | Performance par vendeur | Admin |

#### Relations inter-apps

- Importe `sales.Sale`, `sales.SaleItem`, `stock.StockLevel`, `products.Product`, `authentication.UserProfile`.

---

### App : `settings_app`

**Responsabilité** : Configuration de l'entreprise (affiché sur les factures), catégories produits, montants rapides POS.

> Nommée `settings_app` (et non `settings`) pour éviter le conflit avec le module Python standard `settings`.

#### Modèles

```python
# apps/settings_app/models.py
class CompanySettings(models.Model):
    """Singleton — une seule ligne par déploiement."""
    name        = models.CharField(max_length=255)
    address     = models.TextField(blank=True)
    phone       = models.CharField(max_length=30, blank=True)
    email       = models.EmailField(blank=True)
    nif         = models.CharField(max_length=50, blank=True)   # Numéro d'identification fiscale
    logo_url    = models.URLField(blank=True)
    invoice_header = models.TextField(blank=True)  # Texte personnalisé en-tête facture
    updated_at  = models.DateTimeField(auto_now=True)

class QuickAmount(models.Model):
    """Montants rapides configurables pour le POS."""
    amount  = models.IntegerField()   # en FCFA
    order   = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'amount']
```

#### Endpoints

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/settings/company/` | Lire config entreprise | Admin |
| `PUT` | `/settings/company/` | Mettre à jour config entreprise | Admin |
| `GET` | `/settings/quick-amounts/` | Liste montants rapides POS | Admin, Vendeur |
| `PUT` | `/settings/quick-amounts/` | Mettre à jour montants rapides | Admin |

#### Relations inter-apps

- Importé par `invoices` pour snapshot des infos entreprise à chaque facture générée.

---

## 4. Endpoints API Django

### Conventions

- Préfixe global : `/api/v1/`
- Format : JSON
- Authentification : `Authorization: Bearer <jwt_token>` sur toutes les routes protégées
- Pagination : `?page=1&page_size=20` (défaut 20)
- Filtres : `?search=…&ordering=…`

---

### Auth — `/api/v1/auth/`

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `POST` | `/auth/login/` | Connexion — retourne access + refresh token | Public |
| `POST` | `/auth/refresh/` | Renouvelle l'access token via refresh token | Public |
| `POST` | `/auth/logout/` | Blackliste le refresh token | Authentifié |
| `GET` | `/auth/me/` | Profil de l'utilisateur connecté | Authentifié |
| `PATCH` | `/auth/me/` | Mise à jour nom, mot de passe | Authentifié |

---

### Produits — `/api/v1/products/`

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/products/` | Liste paginée — filtre `?search=` `?category=` | Admin, Vendeur |
| `POST` | `/products/` | Créer un produit | Admin |
| `GET` | `/products/{id}/` | Détail produit | Admin, Vendeur |
| `PUT` | `/products/{id}/` | Mise à jour complète | Admin |
| `PATCH` | `/products/{id}/` | Mise à jour partielle | Admin |
| `DELETE` | `/products/{id}/` | Désactiver (soft delete) | Admin |
| `GET` | `/products/barcode/{code}/` | Lookup par code-barres (POS scanner) | Admin, Vendeur |
| `POST` | `/products/{id}/upload-image/` | Upload image → Supabase Storage | Admin |
| `POST` | `/products/{id}/generate-barcode/` | Génère un code-barres unique | Admin |

**Exemple réponse GET /products/**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Coca-Cola 50cl",
      "barcode": "3245670001234",
      "price": 500,
      "stock_qty": 48,
      "stock_min": 10,
      "image_url": "https://xyz.supabase.co/storage/v1/object/public/product-images/uuid.jpg",
      "category": "Boissons",
      "is_active": true
    }
  ],
  "meta": { "total": 142, "page": 1, "page_size": 20 }
}
```

---

### Stock — `/api/v1/stock/`

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/stock/` | Vue stock tous produits (qty, niveau) | Admin, Vendeur |
| `POST` | `/stock/movements/` | Entrée stock manuelle (livraison, ajustement) | Admin |
| `GET` | `/stock/movements/` | Historique mouvements — filtre `?product=` `?type=` | Admin |
| `GET` | `/stock/alerts/` | Produits en stock bas ou critique | Admin, Vendeur |

---

### Ventes — `/api/v1/sales/`

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/sales/` | Historique ventes — filtre `?date_from=` `?date_to=` `?seller=` | Admin |
| `POST` | `/sales/` | Créer une vente (POS) — décrémente stock + génère facture | Admin, Vendeur |
| `GET` | `/sales/{id}/` | Détail vente avec items | Admin, Vendeur |
| `PATCH` | `/sales/{id}/cancel/` | Annuler une vente (admin seulement, remet stock) | Admin |
| `GET` | `/sales/today/` | Résumé journalier (total, nb ventes, CA) | Admin, Vendeur |

**Payload POST /sales/**
```json
{
  "client_id": "uuid-or-null",
  "items": [
    { "product_id": "uuid", "quantity": 3 },
    { "product_id": "uuid", "quantity": 1 }
  ],
  "amount_paid": 5000,
  "payment_method": "cash",
  "discount": 0
}
```

---

### Factures — `/api/v1/invoices/`

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/invoices/` | Liste factures paginée | Admin, Vendeur |
| `GET` | `/invoices/{id}/` | Détail facture | Admin, Vendeur |
| `GET` | `/invoices/{id}/pdf/` | Télécharge / génère le PDF | Admin, Vendeur |
| `GET` | `/invoices/sale/{sale_id}/` | Facture d'une vente spécifique | Admin, Vendeur |

---

### Clients — `/api/v1/clients/`

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/clients/` | Liste clients — filtre `?search=` | Admin, Vendeur |
| `POST` | `/clients/` | Créer un client | Admin, Vendeur |
| `GET` | `/clients/{id}/` | Détail client | Admin, Vendeur |
| `PUT` | `/clients/{id}/` | Mise à jour client | Admin, Vendeur |
| `DELETE` | `/clients/{id}/` | Supprimer client | Admin |
| `GET` | `/clients/{id}/sales/` | Historique achats du client | Admin, Vendeur |

---

### Utilisateurs — `/api/v1/users/`

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/users/` | Liste utilisateurs | Admin |
| `POST` | `/users/` | Créer un compte vendeur/admin | Admin |
| `GET` | `/users/{id}/` | Détail utilisateur | Admin |
| `PATCH` | `/users/{id}/` | Modifier rôle, statut actif | Admin |
| `DELETE` | `/users/{id}/` | Désactiver compte | Admin |
| `GET` | `/users/{id}/sales/` | Ventes réalisées par cet utilisateur | Admin |

---

### Rapports — `/api/v1/reports/`

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/reports/dashboard/` | KPIs du jour (CA, nb ventes, stock bas) | Admin |
| `GET` | `/reports/sales-by-day/` | CA par jour — `?days=7` (défaut 7) | Admin |
| `GET` | `/reports/top-products/` | Top produits vendus — `?limit=10` | Admin |
| `GET` | `/reports/stock-summary/` | Résumé stock par catégorie | Admin |
| `GET` | `/reports/sales-by-seller/` | Performance par vendeur | Admin |

---

### Paramètres — `/api/v1/settings/`

| Méthode | URL | Description | Rôle |
|---------|-----|-------------|------|
| `GET` | `/settings/company/` | Lire config entreprise (nom, adresse, NIF) | Admin |
| `PUT` | `/settings/company/` | Mettre à jour config entreprise | Admin |

---

## 5. Authentification et autorisation

### Stratégie

```
┌─────────────────────────────────────────────────────────────┐
│  1. Login : POST /api/v1/auth/login/                        │
│     { email, password } → Supabase Auth vérifie             │
│     Django retourne : { access_token, refresh_token,        │
│                          user: { id, email, role } }        │
│                                                             │
│  2. Requêtes API : Authorization: Bearer <access_token>     │
│     Django middleware valide JWT via clé publique Supabase  │
│     Extrait user_id + role du payload JWT                   │
│                                                             │
│  3. Refresh : POST /api/v1/auth/refresh/                    │
│     TanStack Query intercepte 401 et renouvelle             │
│     automatiquement (axios interceptor ou fetch wrapper)    │
└─────────────────────────────────────────────────────────────┘
```

### Durées de vie des tokens

| Token | Durée | Stockage frontend |
|-------|-------|-------------------|
| Access token | 15 minutes | Mémoire (React state / Zustand) |
| Refresh token | 7 jours | `httpOnly` cookie OU `localStorage` (compromis mobile) |

> **Recommandation V1** : `localStorage` pour le refresh token (simplicité PWA mobile). Passer à `httpOnly` cookie en V2 si l'usage desktop augmente.

### Permissions par rôle

| Ressource | Admin | Vendeur |
|-----------|-------|---------|
| Produits (lecture) | ✅ | ✅ |
| Produits (écriture) | ✅ | ❌ |
| Stock mouvements | ✅ | Lecture seule |
| POS / Ventes créer | ✅ | ✅ |
| Ventes annuler | ✅ | ❌ |
| Factures | ✅ | ✅ |
| Clients | ✅ | ✅ |
| Utilisateurs | ✅ | ❌ |
| Rapports | ✅ | Tableau de bord limité |
| Paramètres | ✅ | ❌ |

### Implémentation Django

```python
# core/permissions.py

from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.profile.role == 'admin'
        )

class IsAdminOrVendeur(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.profile.role in ('admin', 'vendeur')
        )

# Utilisation dans les ViewSets :
# permission_classes = [IsAdmin]          # routes admin uniquement
# permission_classes = [IsAdminOrVendeur] # routes partagées
```

### Protection des routes frontend

```tsx
// src/components/auth/ProtectedRoute.tsx
// Vérifie le rôle avant de rendre la page
// Redirige vers /dashboard si rôle insuffisant

// Exemple : UsersPage et ReportsPage → admin uniquement
// PosPage, ClientsPage → admin + vendeur
```

---

## 6. Storage — Images produits

### Bucket Supabase Storage

```
Bucket : product-images
Accès  : public (URL directe lisible sans token)
Path   : {product_id}/{filename}.{ext}
Exemple: product-images/uuid-produit/photo-principale.jpg
```

### Flux upload (depuis Django)

```
1. Frontend envoie image en multipart/form-data
   POST /api/v1/products/{id}/upload-image/
   Content-Type: multipart/form-data
   body: { image: <fichier> }

2. Django reçoit le fichier en mémoire (max 5 MB)
3. Django valide : type MIME (image/jpeg, image/png, image/webp)
4. Django upload vers Supabase Storage via supabase-py client
   storage.from_("product-images").upload(path, file_bytes)
5. Django récupère l'URL publique
   storage.from_("product-images").get_public_url(path)
6. Django sauvegarde image_url + image_path sur le Product
7. Retourne { image_url } au frontend
8. Frontend met à jour l'affichage produit
```

### Flux upload alternatif (pré-signé, optionnel V2)

Pour éviter le transit par Django (fichiers volumineux), générer une URL pré-signée côté Django et uploader directement depuis le navigateur vers Supabase Storage.

### Paramètres images

| Paramètre | Valeur |
|-----------|--------|
| Taille max | 5 MB |
| Formats acceptés | JPEG, PNG, WebP |
| Redimensionnement | Non (V1), Supabase Image Transformations en V2 |
| Suppression | Lors du soft delete produit, conserver l'image (audit) |

---

## 7. Déploiement

### Architecture de production

```
┌───────────────┐     ┌──────────────────────┐     ┌───────────────────┐
│    Vercel     │     │   VPS / Railway       │     │    Supabase       │
│               │     │                      │     │    Cloud          │
│  React PWA    │────▶│  Docker container    │────▶│                   │
│  (static CDN) │     │                      │     │  PostgreSQL       │
│               │     │  Nginx (reverse proxy│     │  Auth             │
│  vite build   │     │  + SSL termination)  │     │  Storage          │
│  sw.js (PWA)  │     │                      │     │  Realtime         │
└───────────────┘     │  Gunicorn (Django)   │     └───────────────────┘
                      │  + Celery (optionnel)│
                      └──────────────────────┘
```

### Dockerfile (Django multi-apps)

```dockerfile
# inventory_backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Dépendances système pour WeasyPrint (PDF) et Pillow (images)
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 libpangoft2-1.0-0 libgdk-pixbuf2.0-0 \
    libffi-dev shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Installer les dépendances de production uniquement
COPY requirements/base.txt requirements/production.txt ./requirements/
RUN pip install --no-cache-dir -r requirements/production.txt

COPY . .

# Collecte des fichiers statiques (admin Django, DRF browsable API)
RUN python manage.py collectstatic --noinput \
    --settings=config.settings.production

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "60"]
```

### docker-compose.yml (développement local)

```yaml
version: '3.9'

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.development
    volumes:
      # Monte le code source pour le rechargement automatique en dev
      - .:/app
      # Exclut les fichiers statiques collectés du montage
      - /app/staticfiles
    command: python manage.py runserver 0.0.0.0:8000
    depends_on:
      - redis

  redis:
    # Cache optionnel — utile pour les agrégations reports en V2
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # En développement, Supabase est hébergé en cloud
  # Pas besoin de PostgreSQL local
```

### Variables d'environnement

#### Backend Django (`.env`)

```bash
# Django
DJANGO_SECRET_KEY=<clé-secrète-longue-aléatoire>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api.naoservices.com,localhost

# Base de données Supabase (PostgreSQL direct)
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # JAMAIS exposé côté client

# JWT (clé publique Supabase pour valider les tokens)
SUPABASE_JWT_SECRET=<jwt-secret-from-supabase-dashboard>

# CORS
CORS_ALLOWED_ORIGINS=https://inventory.naoservices.com,http://localhost:8080

# Storage
SUPABASE_STORAGE_BUCKET_PRODUCTS=product-images

# Email (optionnel V1)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=noreply@naoservices.com
EMAIL_HOST_PASSWORD=<password>
```

#### Frontend Vite (`.env.production` sur Vercel)

```bash
# URL de l'API Django
VITE_API_BASE_URL=https://api.naoservices.com/api/v1

# Supabase (clé publique uniquement — pas de service role !)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>

# Config app
VITE_APP_NAME=NAOSERVICES Inventory
VITE_APP_CURRENCY=FCFA
```

> **Sécurité** : `SUPABASE_SERVICE_ROLE_KEY` ne doit JAMAIS figurer dans les variables Vite. Elle ne s'utilise que côté serveur Django.

### Configuration Vercel (`vercel.json`)

```json
{
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    }
  ]
}
```

---

## 8. Roadmap d'implémentation

### Phase 0 — Setup backend (Semaine 1)

**Objectif** : Structure multi-apps Django opérationnelle, connexion Supabase, premier endpoint fonctionnel.

- [ ] Créer projet Django : `django-admin startproject config .`
- [ ] Créer le dossier `apps/` et initialiser chaque app : `python manage.py startapp authentication apps/authentication` (répéter pour chaque app)
- [ ] Créer `core/` avec `permissions.py`, `pagination.py`, `middleware.py`, `storage.py`
- [ ] Configurer `requirements/base.txt`, `development.txt`, `production.txt`
- [ ] Configurer `config/settings/base.py` : `INSTALLED_APPS`, `DATABASE_URL`, DRF, JWT, CORS
- [ ] Configurer `config/urls.py` : inclure les URLs de chaque app sous `/api/v1/`
- [ ] Connecter `DATABASE_URL` vers Supabase PostgreSQL (via `dj-database-url`)
- [ ] Implémenter `apps/authentication` : modèle `UserProfile` + `POST /auth/login/` valide via Supabase Auth
- [ ] Créer middleware JWT custom dans `core/middleware.py` (vérifie token Supabase, injecte user Django)
- [ ] Migration initiale (`python manage.py migrate`)
- [ ] Tester avec Postman : login → token → `GET /auth/me/`
- [ ] Dockeriser : `Dockerfile` + `docker-compose.yml` avec `DJANGO_SETTINGS_MODULE=config.settings.development`
- [ ] Déployer sur Railway/Render (staging)

### Phase 1 — Produits + Stock (Semaine 2)

**Objectif** : Remplacer les mock data de `ProductsPage` et `StockPage`.

- [ ] Créer modèles `Product` + `StockMovement` + migrations
- [ ] Implémenter `ProductViewSet` (CRUD complet + lookup barcode)
- [ ] Implémenter `StockViewSet` (liste + mouvements)
- [ ] Upload image produit vers Supabase Storage
- [ ] Côté frontend : créer `src/lib/api.ts` (client HTTP avec intercepteur JWT)
- [ ] Créer hooks TanStack Query : `useProducts()`, `useProduct(id)`, `useProductByBarcode(code)`
- [ ] Brancher `ProductsPage.tsx` sur les vrais endpoints
- [ ] Brancher `StockPage.tsx`

### Phase 2 — POS + Ventes (Semaine 3)

**Objectif** : Le module POS existant (déjà fonctionnel en UI) écrit des vraies ventes.

- [ ] Créer modèles `Sale`, `SaleItem` + migrations
- [ ] Implémenter `SaleViewSet.create()` : validation stock, décrément, génération numéro vente
- [ ] Signal Django post-save sur `Sale` : crée `StockMovement` pour chaque item
- [ ] Côté frontend : mutation TanStack Query `useCreateSale()`
- [ ] Brancher `PosPage.tsx` — remplacer la logique mock par l'appel API
- [ ] Tester le scan barcode → lookup produit → ajout panier → POST /sales/

### Phase 3 — Facturation PDF (Semaine 4)

**Objectif** : Générer et imprimer des vraies factures.

- [ ] Créer modèle `Invoice` + migration
- [ ] Signal post-save `Sale` → crée `Invoice` automatiquement
- [ ] Implémenter génération PDF avec WeasyPrint (template HTML → PDF)
- [ ] Upload PDF vers Supabase Storage
- [ ] Endpoint `GET /invoices/{id}/pdf/` → stream du PDF ou redirect URL
- [ ] Brancher `InvoicesPage.tsx` : liste + bouton Imprimer ouvre l'URL PDF

### Phase 4 — Clients + Utilisateurs (Semaine 5)

**Objectif** : Gestion complète des clients et des comptes vendeurs.

- [ ] Implémenter `ClientViewSet` (CRUD + historique achats)
- [ ] Implémenter `UserViewSet` (admin crée/désactive comptes vendeurs)
- [ ] Création compte vendeur = crée user Supabase Auth + `UserProfile` Django
- [ ] Brancher `ClientsPage.tsx`
- [ ] Brancher `UsersPage.tsx`
- [ ] Implémenter protection des routes frontend par rôle

### Phase 5 — Auth frontend (Semaine 5, en parallèle)

**Objectif** : Remplacer le faux login par une vraie authentification.

- [ ] Créer `src/lib/auth.ts` : fonctions login/logout/refresh
- [ ] Créer `AuthContext` ou store Zustand : `user`, `token`, `role`, `isAuthenticated`
- [ ] Modifier `LoginPage.tsx` : appel `POST /auth/login/` → stocker token → redirect dashboard
- [ ] Créer composant `ProtectedRoute` : vérifie `isAuthenticated` + `role`
- [ ] Appliquer `ProtectedRoute` dans `App.tsx` sur les routes protégées
- [ ] Intercepteur axios/fetch : inject Bearer token, refresh automatique sur 401
- [ ] Tester : login admin → accès complet / login vendeur → accès restreint

### Phase 6 — Rapports + Dashboard (Semaine 6)

**Objectif** : Données réelles dans Dashboard et ReportsPage.

- [ ] Implémenter endpoints rapports Django avec agrégations SQL
- [ ] Brancher `DashboardPage.tsx` : KPIs réels (CA jour, nb ventes, alertes stock)
- [ ] Brancher `ReportsPage.tsx` : graphe ventes par jour, top produits
- [ ] Implémenter Supabase Realtime (optionnel) : subscribe aux nouvelles ventes pour le dashboard du propriétaire à distance

### Phase 7 — Paramètres + finitions (Semaine 6–7)

- [ ] Implémenter `GET/PUT /settings/company/`
- [ ] Brancher `SettingsPage.tsx`
- [ ] Audit sécurité : valider tous les inputs côté Django, vérifier permissions
- [ ] Tests Django : couverture 80%+ sur les ViewSets critiques (Sale, Product)
- [ ] Configuration Nginx + SSL sur VPS
- [ ] Deploy production : Vercel (front) + Docker VPS (back)
- [ ] Tests E2E Playwright : login → scan produit → vente → facture PDF

---

## Annexe — Requirements Python par catégorie

### `requirements/base.txt` — Dépendances communes

```
# ── Django + DRF ──────────────────────────────────────────────────────────────
django>=5.0,<6.0
djangorestframework>=3.15
django-filter>=24.0

# ── Authentification JWT ──────────────────────────────────────────────────────
djangorestframework-simplejwt>=5.3
PyJWT>=2.8               # Validation manuelle des tokens Supabase

# ── PostgreSQL / Supabase ─────────────────────────────────────────────────────
psycopg2-binary>=2.9     # Driver PostgreSQL pour Django ORM
supabase>=2.4            # SDK officiel Supabase Python (Auth + Storage)
dj-database-url>=2.1     # Parse DATABASE_URL en config Django

# ── CORS + Sécurité ───────────────────────────────────────────────────────────
django-cors-headers>=4.3

# ── Génération PDF (factures) ─────────────────────────────────────────────────
WeasyPrint>=62.0         # HTML → PDF (nécessite libpango côté système)

# ── Génération codes-barres ───────────────────────────────────────────────────
python-barcode>=0.15     # Génère Code128, EAN13, etc.
Pillow>=10.0             # Traitement images + rendu codes-barres en PNG/SVG

# ── Stockage images ───────────────────────────────────────────────────────────
# Upload via supabase-py (SDK inclus dans supabase>=2.4)
# Pas de django-storages nécessaire en V1

# ── Config / Environnement ────────────────────────────────────────────────────
python-decouple>=3.8     # Lecture .env avec valeurs par défaut
```

### `requirements/development.txt` — Dev uniquement

```
-r base.txt

# ── Tests ─────────────────────────────────────────────────────────────────────
pytest>=8.0
pytest-django>=4.8
pytest-cov>=5.0
factory-boy>=3.3         # Fixtures de test

# ── Qualité de code ───────────────────────────────────────────────────────────
ruff>=0.4                # Linter + formateur Python
```

### `requirements/production.txt` — Production uniquement

```
-r base.txt

# ── Serveur WSGI ──────────────────────────────────────────────────────────────
gunicorn>=22.0

# ── Sécurité prod ─────────────────────────────────────────────────────────────
django-csp>=3.8          # Content Security Policy headers
```
