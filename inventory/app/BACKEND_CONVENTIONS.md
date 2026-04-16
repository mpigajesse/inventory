# NAOSERVICES INVENTORY — Conventions de backend

**Version:** 1.0  
**Dernière mise à jour:** 2026-04-16  
**Contexte:** Application de gestion de stock et de ventes (PWA) — V1

Ce document établit les conventions d'architecture, de nommage et de structure pour le backend Supabase/PostgreSQL de l'application NAOSERVICES INVENTORY.

---

## Table des matières

1. [Stratégie générale](#stratégie-générale)
2. [Base de données Supabase/PostgreSQL](#base-de-données-supabasepostgresql)
3. [Configuration Supabase](#configuration-supabase)
4. [Configuration Cloudinary](#configuration-cloudinary)
5. [Couche API TypeScript](#couche-api-typescript)
6. [Plan de migration frontend → backend](#plan-de-migration-frontend--backend)
7. [Variables d'environnement](#variables-denvironnement)

---

## Stratégie générale

### Principes

- **Nommage:** 
  - Tables et colonnes : `snake_case` (PostgreSQL)
  - Services TypeScript : `camelCase` + suffixe `.ts`
  - Fonctions/exports : `camelCase`
  - Types/Interfaces TypeScript : `PascalCase`

- **Langage du code:** English (noms de variables, commentaires techniques)
- **Langage UI:** French (valeurs de base de données, labels d'énumération)
- **Monnaie:** FCFA (XAF), stockée en entiers (pas de décimales)
- **Timezone:** UTC dans la base, convertir au fuseau Gabon (UTC+1) côté frontend

- **RLS (Row Level Security):** Activé par défaut pour toutes les tables utilisateur-dépendantes
- **Audit:** Colonnes `created_at`, `updated_at` (timestamps auto) et optionnellement `created_by`, `updated_by` (user IDs)

### Schéma de réponse API

Toutes les réponses API suivent ce modèle (TypeScript/JSON):

```typescript
interface ApiResponse<T> {
  success: boolean;        // true si succès, false si erreur
  data?: T;                // Payload (null si erreur)
  error?: string;          // Message d'erreur lisible (null si succès)
  meta?: {                 // Optionnel, pour pagination/agrégats
    total?: number;
    page?: number;
    limit?: number;
    count?: number;
  };
}
```

---

## Base de données Supabase/PostgreSQL

### Tables et schéma

Toutes les colonnes `id` sont UUID v4 sauf indication contraire.  
Les prix sont en FCFA (entiers, pas de décimales).

#### 1. **users** — Authentification et gestion utilisateurs

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendeur')), -- Rôle de l'utilisateur
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Index pour recherche rapide par email
CREATE UNIQUE INDEX idx_users_email ON users(email);
```

**Rôles :**
- `admin` — Accès complet (produits, stock, utilisateurs, rapports, paramètres)
- `vendeur` — POS, factures, clients uniquement

**RLS Policy :**
- Admin peut lire/modifier tous les utilisateurs
- Vendeur ne peut lire/modifier que son propre profil

---

#### 2. **categories** — Catégories de produits

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon_name VARCHAR(50),  -- Nom de l'icône (ex: "package", "utensils")
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_categories_name ON categories(name);
```

**Exemples :**
- Alimentaire
- Boissons
- Hygiène
- Entretien
- Autre

---

#### 3. **products** — Catalogue de produits

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  barcode VARCHAR(100) UNIQUE,  -- Code-barres (EAN13, etc.)
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE SET NULL,
  price_fcfa INTEGER NOT NULL CHECK (price_fcfa > 0),  -- En FCFA, pas de décimales
  image_url TEXT,  -- URL Cloudinary (product-images/)
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Index pour recherche rapide
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name ON products USING gin(name gin_trgm_ops); -- Full-text search (optionnel)
```

---

#### 4. **stock** — Stock courant par produit

```sql
CREATE TABLE stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  minimum_quantity INTEGER NOT NULL DEFAULT 10,  -- Seuil critique
  maximum_quantity INTEGER NOT NULL DEFAULT 100, -- Stock idéal
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

-- Index pour recherche par produit
CREATE INDEX idx_stock_product ON stock(product_id);
```

**Logique de statut (calculé côté frontend/backend):**
```typescript
function getStockStatus(item: StockItem): 'critical' | 'low' | 'normal' {
  const { quantity, minimum_quantity } = item;
  if (quantity <= minimum_quantity * 0.5) return 'critical';  // <= 50% du seuil
  if (quantity <= minimum_quantity) return 'low';
  return 'normal';
}
```

---

#### 5. **stock_movements** — Historique des mouvements de stock

```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('inbound', 'outbound', 'adjustment')),
  quantity INTEGER NOT NULL,  -- Positif pour entrée, négatif pour sortie
  reason TEXT,  -- "Purchase", "Sale", "Correction", "Loss", etc.
  reference_id UUID,  -- ID de la commande fournisseur ou facture (optionnel)
  reference_type VARCHAR(50),  -- "purchase_order", "sale", "correction"
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id)
);

-- Index pour recherche par produit et date
CREATE INDEX idx_stock_movements_product_date ON stock_movements(product_id, created_at DESC);
```

**Types de mouvement :**
- `inbound` — Entrée (approvisionnement)
- `outbound` — Sortie (vente, perte)
- `adjustment` — Correction d'inventaire

---

#### 6. **sales** — Transactions de vente (tickets POS)

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) NOT NULL UNIQUE,  -- Format: TKT-YYYY-NNNN
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,  -- Optionnel
  total_amount_fcfa INTEGER NOT NULL CHECK (total_amount_fcfa >= 0),
  amount_paid_fcfa INTEGER NOT NULL CHECK (amount_paid_fcfa >= 0),
  change_fcfa INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'check')),
  notes TEXT,
  sale_status TEXT DEFAULT 'completed' CHECK (sale_status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id)
);

-- Index pour recherche rapide
CREATE INDEX idx_sales_ticket_number ON sales(ticket_number);
CREATE INDEX idx_sales_client ON sales(client_id);
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);
```

---

#### 7. **sale_items** — Détail ligne des ventes

```sql
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_fcfa INTEGER NOT NULL CHECK (unit_price_fcfa > 0),  -- Prix au moment de la vente
  subtotal_fcfa INTEGER NOT NULL GENERATED ALWAYS AS (quantity * unit_price_fcfa) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche par vente
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
```

---

#### 8. **invoices** — Factures (générées après vente ou manuellement)

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,  -- Format: FAC-YYYY-NNNN
  sale_id UUID UNIQUE REFERENCES sales(id) ON DELETE SET NULL,  -- Peut être générée depuis une vente
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  total_amount_fcfa INTEGER NOT NULL CHECK (total_amount_fcfa > 0),
  paid_amount_fcfa INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount_fcfa >= 0),
  remaining_amount_fcfa INTEGER GENERATED ALWAYS AS (total_amount_fcfa - paid_amount_fcfa) STORED,
  paid_status TEXT DEFAULT 'unpaid' CHECK (paid_status IN ('unpaid', 'partial', 'paid')),
  payment_method TEXT,
  invoice_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  due_date DATE,
  notes TEXT,
  pdf_url TEXT,  -- URL du PDF stocké sur Cloudinary (invoice-pdfs/)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Index pour recherche rapide
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(paid_status);
```

---

#### 9. **clients** — Fiches client

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  total_purchases_fcfa INTEGER DEFAULT 0,  -- Montant total acheté (dénormalisé pour performance)
  total_spent_fcfa INTEGER DEFAULT 0,      -- Montant total dépensé (après paiements)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Index pour recherche rapide
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_phone ON clients(phone);
```

---

#### 10. **suppliers** — Fournisseurs

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  contact_name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  payment_terms TEXT,  -- Ex: "30 jours", "net"
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Index pour recherche rapide
CREATE INDEX idx_suppliers_name ON suppliers(name);
```

---

#### 11. **purchase_orders** — Commandes fournisseur

```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) NOT NULL UNIQUE,  -- Format: PO-YYYY-NNNN
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  total_amount_fcfa INTEGER NOT NULL CHECK (total_amount_fcfa > 0),
  paid_amount_fcfa INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount_fcfa >= 0),
  remaining_amount_fcfa INTEGER GENERATED ALWAYS AS (total_amount_fcfa - paid_amount_fcfa) STORED,
  po_status TEXT DEFAULT 'draft' CHECK (po_status IN ('draft', 'sent', 'received', 'cancelled')),
  po_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Index pour recherche rapide
CREATE INDEX idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(po_status);
```

---

#### 12. **purchase_order_items** — Détail ligne des commandes

```sql
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INTEGER DEFAULT 0 CHECK (quantity_received >= 0),
  unit_price_fcfa INTEGER NOT NULL CHECK (unit_price_fcfa > 0),
  subtotal_fcfa INTEGER NOT NULL GENERATED ALWAYS AS (quantity_ordered * unit_price_fcfa) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche par commande
CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);
```

---

#### 13. **activity_logs** — Journal d'activité (audit trail)

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,  -- "create", "update", "delete", "login", "export"
  entity_type VARCHAR(50),  -- "product", "sale", "user", etc.
  entity_id UUID,
  details JSONB,  -- Données supplémentaires (optionnel)
  ip_address VARCHAR(45),  -- IPv4 ou IPv6
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
```

---

#### 14. **notifications** — Alertes et notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('info', 'warning', 'error', 'success')),
  link_url TEXT,  -- URL vers la page concernée
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Index pour recherche rapide
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

---

#### 15. **company_settings** — Paramètres généraux de l'entreprise

```sql
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'string' CHECK (setting_type IN ('string', 'integer', 'boolean', 'json')),
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

-- Exemples de clés :
-- company_name
-- company_phone
-- company_email
-- company_address
-- company_logo_url (Cloudinary: avatars/)
-- company_tax_id (NIF)
-- currency_code (XAF)
-- timezone (Africa/Libreville)
```

---

### Conventions de schéma

1. **Tous les IDs:** UUID v4 sauf exception
2. **Timestamps:** `created_at`, `updated_at` ALWAYS en UTC
3. **Monnaie:** `*_fcfa` suffixe, INTEGER (pas de décimales)
4. **Booleans:** VARCHAR avec CHECK constraint ou BOOLEAN type
5. **Énumérations:** VARCHAR avec CHECK constraint
6. **Soft deletes:** NON utilisés — suppression physique avec CASCADE soigneusement
7. **Dénormalisation:** Minimale, sauf pour compteurs rapides (`total_purchases_fcfa`)

---

## Configuration Supabase

### Authentification

**Méthode:** Email + password via Supabase Auth

- La table `users` est séparée de la table `auth.users` de Supabase (plus de flexibilité)
- Synchroniser via trigger après `auth.users.on_auth_user_created()`

```sql
-- Trigger exemple (optionnel, si on utilise auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'role')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Rôles dans metadata:**

```json
{
  "role": "admin",
  "name": "Admin Principal",
  "phone": "+241 07 40 13 02"
}
```

### RLS (Row Level Security)

**Activé par défaut pour:**
- `users` — Admin voit tous, vendeur ne voit que lui-même
- `sales` — Vendeur ne voit que ses propres ventes
- `invoices` — Vendeur ne voit que ses propres factures
- `activity_logs` — Vendeur ne voit que ses propres actions
- `notifications` — Chacun ne voit que ses notifications

**Exemple RLS pour sales:**

```sql
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can see all sales"
  ON sales FOR SELECT
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Vendeurs see their own sales"
  ON sales FOR SELECT
  USING (auth.jwt()->>'role' = 'vendeur' AND created_by = auth.uid());

CREATE POLICY "Users can create sales"
  ON sales FOR INSERT
  WITH CHECK (auth.uid() = created_by);
```

### Connection Pool

- Paquet: `connection_limit` = 10 (suffisant pour une PWA)
- Mode: `transaction` (recommandé pour Supabase)
- Timeout: 30 secondes

### Storage Buckets

Trois buckets publics:

1. **product-images**
   - Chemins: `inventory/products/{product_id}/`
   - Format: JPEG, PNG, WebP max 5MB
   - RLS: Public read, auth write

2. **invoice-pdfs**
   - Chemins: `inventory/invoices/{invoice_id}/`
   - Format: PDF max 10MB
   - RLS: Public read, auth write

3. **avatars**
   - Chemins: `inventory/avatars/{user_id}/`
   - Format: JPEG, PNG, WebP max 2MB
   - RLS: Public read, auth write

---

## Configuration Cloudinary

### Setup

**Service:** Image & PDF delivery + transformation

**Folders:**
```
inventory/
├── products/          # Images des produits
│   └── {product_uuid}/
├── invoices/          # PDFs des factures
│   └── {invoice_uuid}/
└── avatars/           # Photos de profil
    └── {user_uuid}/
```

### Upload Presets

**`inventory_products_unsigned`** (pour uploads publics depuis frontend)
- Dossier: `inventory/products`
- Types acceptés: image/jpeg, image/png, image/webp
- Max size: 5MB
- Transformations auto: `c_limit,w_400,h_400,q_85`
- Signature: unsigned (plus simple pour le frontend)

**`inventory_avatars_unsigned`**
- Dossier: `inventory/avatars`
- Types acceptés: image/jpeg, image/png
- Max size: 2MB
- Transformations auto: `c_fill,w_200,h_200,q_85`

### Transformations standards

```typescript
// Produits : thumbnail
`https://res.cloudinary.com/{CLOUD_NAME}/image/upload/c_limit,w_80,h_80,q_85/inventory/products/{uuid}`

// Produits : galerie
`https://res.cloudinary.com/{CLOUD_NAME}/image/upload/c_limit,w_400,h_400,q_85/inventory/products/{uuid}`

// Avatars : profil
`https://res.cloudinary.com/{CLOUD_NAME}/image/upload/c_fill,w_200,h_200,q_85/inventory/avatars/{uuid}`

// PDFs : embed ou téléchargement
`https://res.cloudinary.com/{CLOUD_NAME}/raw/upload/inventory/invoices/{uuid}`
```

---

## Couche API TypeScript

### Organisation des services

```
src/services/
├── auth.service.ts          # Login, register, logout
├── products.service.ts      # CRUD produits
├── stock.service.ts         # Stock et mouvements
├── sales.service.ts         # Créer et récupérer ventes
├── invoices.service.ts      # Factures
├── clients.service.ts       # Gestion clients
├── suppliers.service.ts     # Fournisseurs
├── purchase-orders.service.ts  # Commandes fournisseur
├── notifications.service.ts # Alertes
├── activity-logs.service.ts # Audit trail
└── cloudinary.service.ts    # Upload images
```

### Signature des fonctions service

**Naming:** `getPluralNoun()`, `getNoun()`, `createNoun()`, `updateNoun()`, `deleteNoun()`, `searchNoun()`

```typescript
// src/services/products.service.ts

import { createClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@/types/api';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Product {
  id: string;
  name: string;
  barcode: string;
  price_fcfa: number;
  category_id: string;
  image_url?: string;
  is_active: boolean;
}

interface CreateProductInput {
  name: string;
  barcode: string;
  price_fcfa: number;
  category_id: string;
  image_url?: string;
}

interface UpdateProductInput extends Partial<CreateProductInput> {}

export async function getProducts(
  filters?: { categoryId?: string; isActive?: boolean; limit?: number; offset?: number }
): Promise<ApiResponse<Product[]>> {
  try {
    let query = supabase.from('products').select('*');

    if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);

    const { data, error, count } = await query
      .range(filters?.offset ?? 0, (filters?.offset ?? 0) + (filters?.limit ?? 50) - 1);

    if (error) throw error;

    return {
      success: true,
      data: data || [],
      meta: { total: count, limit: filters?.limit ?? 50, offset: filters?.offset ?? 0 }
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

export async function getProductById(id: string): Promise<ApiResponse<Product>> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

export async function getProductByBarcode(barcode: string): Promise<ApiResponse<Product>> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

export async function createProduct(
  input: CreateProductInput,
  userId: string
): Promise<ApiResponse<Product>> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...input,
        created_by: userId
      })
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  userId: string
): Promise<ApiResponse<Product>> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        ...input,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

export async function deleteProduct(id: string): Promise<ApiResponse<void>> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error)
    };
  }
}

// Utilitaire
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Une erreur est survenue';
}
```

### React Query Keys

Convention de clés (TanStack Query):

```typescript
// src/lib/query-keys.ts

export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (filters?: object) => [...queryKeys.products.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
  },
  stock: {
    all: ['stock'] as const,
    list: (filters?: object) => [...queryKeys.stock.all, 'list', filters] as const,
    detail: (productId: string) => [...queryKeys.stock.all, 'detail', productId] as const,
  },
  sales: {
    all: ['sales'] as const,
    list: (filters?: object) => [...queryKeys.sales.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.sales.all, 'detail', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: (filters?: object) => [...queryKeys.invoices.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.invoices.all, 'detail', id] as const,
  },
  clients: {
    all: ['clients'] as const,
    list: (filters?: object) => [...queryKeys.clients.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.clients.all, 'detail', id] as const,
  },
};
```

### Gestion des erreurs

```typescript
// src/types/errors.ts

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404);
  }
}

export class AuthError extends ApiError {
  constructor(message: string) {
    super('AUTH_ERROR', message, 401);
  }
}
```

---

## Plan de migration frontend → backend

### Phase 1 : Authentification (Priorité 1)

**Mock data:** `AuthContext.tsx` → `users` table  
**Cibles:**
- `LoginPage.tsx` → API `auth.service.ts`
- `RegisterPage.tsx` → API `auth.service.ts`
- Auth context → Supabase Auth + JWT

**Tasks:**
1. Créer table `users` + RLS
2. Supabase Auth setup (email/password)
3. Implémenter `auth.service.ts`
4. Mettre à jour `AuthContext` pour utiliser le service
5. Ajouter refresh token handling

---

### Phase 2 : Produits & Stock (Priorité 2)

**Mock data:** `ProductsPage.tsx`, `StockPage.tsx`  
**Cibles:**
- `categories`, `products`, `stock` tables
- `products.service.ts`
- `stock.service.ts`

**Tasks:**
1. Créer tables `categories`, `products`, `stock`
2. Implémenter `products.service.ts` (CRUD complet)
3. Implémenter `stock.service.ts` (read + adjust)
4. Remplacer état local par React Query
5. Ajouter Cloudinary uploader pour images produits

---

### Phase 3 : Ventes & POS (Priorité 1)

**Mock data:** `PosPage.tsx`  
**Cibles:**
- `sales`, `sale_items` tables
- `sales.service.ts`
- Stock décrémenté après vente

**Tasks:**
1. Créer tables `sales`, `sale_items`
2. Implémenter `sales.service.ts`
3. **IMPORTANT:** Créer fonction `createSaleWithStockUpdate()` qui :
   - Insère la vente + items
   - Décrémente `stock.quantity` pour chaque item
   - Log le mouvement dans `stock_movements`
   - Transaction atomique (ROLLBACK si stock insuffisant)
4. Connecter `PosPage` au service
5. Ajouter gestion scan code-barres en temps réel

---

### Phase 4 : Facturation (Priorité 2)

**Mock data:** `InvoicesPage.tsx`  
**Cibles:**
- `invoices` table
- `invoices.service.ts`
- Génération PDF via Cloudinary + node-html-pdf

**Tasks:**
1. Créer table `invoices`
2. Implémenter `invoices.service.ts`
3. Implémenter `generateInvoicePdf()` (PDFKit ou pdflib)
4. Uploader PDF sur Cloudinary
5. Connecter `InvoicesPage` au service
6. Ajouter impression (react-to-print)

---

### Phase 5 : Clients (Priorité 3)

**Mock data:** `ClientsPage.tsx`  
**Cibles:**
- `clients` table
- `clients.service.ts`

**Tasks:**
1. Créer table `clients`
2. Implémenter `clients.service.ts`
3. Connecter `ClientsPage` au service
4. Ajouter historique achats (requête JOIN avec `sales`)
5. Optionnel : Suivi dettes/crédits

---

### Phase 6 : Audit & Logs (Priorité 3)

**Mock data:** Aucune (nouveau)  
**Cibles:**
- `activity_logs`, `notifications` tables
- `activity-logs.service.ts`

**Tasks:**
1. Créer tables `activity_logs`, `notifications`
2. Trigger sur chaque INSERT/UPDATE/DELETE pour log
3. Implémenter `activity-logs.service.ts`
4. Ajouter page `ActivityLogPage` (admin only)
5. Système de notifications (toast + bell icon)

---

### Phase 7 : Fournisseurs & Commandes (Priorité 4, V2)

**Mock data:** Aucune (nouveau)  
**Cibles:**
- `suppliers`, `purchase_orders`, `purchase_order_items` tables

**Tasks:** (À planifier pour V2)

---

### Phase 8 : Paramètres & Rapports (Priorité 3)

**Mock data:** `SettingsPage.tsx`, `ReportsPage.tsx`  
**Cibles:**
- `company_settings` table
- Queries agrégées (ventes/jour, top produits)

**Tasks:**
1. Créer table `company_settings`
2. Implémenter `settings.service.ts`
3. Agrégations SQL pour rapports
4. Connecter `ReportsPage` au service
5. Graphiques (recharts)

---

## Variables d'environnement

### .env.example

```bash
# ═══════════════════════════════════════════════════════════════════
# NAOSERVICES INVENTORY — Variables d'environnement
# ═══════════════════════════════════════════════════════════════════

# ─── Supabase ─────────────────────────────────────────────────────
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── Cloudinary ───────────────────────────────────────────────────
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key
VITE_CLOUDINARY_UPLOAD_PRESET=inventory_products_unsigned

# ─── API Base URL (optionnel si on utilise Supabase client side) ──
VITE_API_BASE_URL=http://localhost:3000

# ─── Environment ──────────────────────────────────────────────────
VITE_ENV=development  # development, staging, production

# ─── Logging ───────────────────────────────────────────────────────
VITE_LOG_LEVEL=debug  # debug, info, warn, error
```

### Installation

```bash
# Copier le template
cp .env.example .env.local

# Remplir les valeurs depuis Supabase et Cloudinary
# ✓ VITE_SUPABASE_URL — Settings > API
# ✓ VITE_SUPABASE_ANON_KEY — Settings > API > anon public
# ✓ VITE_CLOUDINARY_CLOUD_NAME — Account > Cloud name
# ✓ VITE_CLOUDINARY_API_KEY — Settings > API Keys
```

---

## Checklist de déploiement

- [ ] Tables Supabase créées et indexées
- [ ] RLS policies configurées par rôle
- [ ] Storage buckets créés (product-images, invoice-pdfs, avatars)
- [ ] Cloudinary upload presets configurés
- [ ] Services TypeScript implémentés (`products.service.ts`, `sales.service.ts`, etc.)
- [ ] React Query hooks créés et clés conventions suivies
- [ ] Pages connectées aux services (remplacer mock data)
- [ ] Tests unitaires services (minimum 80% coverage)
- [ ] Tests E2E POS + vente (Playwright)
- [ ] Variables d'environnement Supabase/Cloudinary validées
- [ ] Triggers d'audit configurés (`activity_logs`)
- [ ] Sauvegarde/export données documentée
- [ ] Documentation API (Swagger/OpenAPI optionnel)

---

**Fin du document**

*Pour toute question ou mise à jour, consulter le CLAUDE.md du projet.*
