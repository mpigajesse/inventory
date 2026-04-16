# Notifications — NAOSERVICES INVENTORY

> PWA React/Vite + Django backend (prévu) + Supabase  
> Contexte : gestion de stock en magasin (Gabon), accès mobile prioritaire

---

## 1. Analyse des besoins par canal

### 1.1 In-app (toast / badge / modal)

| Besoin | Type recommandé | Priorité |
|--------|----------------|----------|
| Confirmation de vente (caissier) | Toast success (éphémère, 3-5 s) | Haute |
| Stock bas atteint (seuil configurable) | Toast warning persistant | Haute |
| Stock critique / rupture imminente | Modal bloquante ou banner rouge | Haute |
| Rappel réapprovisionnement | Badge sur icône nav + toast | Moyenne |
| Erreur réseau / sync échouée | Toast error persistant | Haute |

**Règles UX :**
- Les toasts non critiques disparaissent automatiquement (4 s).
- Les alertes stock critique restent jusqu'à action explicite de l'utilisateur.
- Un badge numérique sur l'icône "Stock" indique le nombre de produits en alerte.

---

### 1.2 Push Notifications PWA

Adressées au propriétaire (ou gérant distant) sur son mobile même lorsque l'app est fermée.

| Déclencheur | Contenu du push | Destinataire |
|-------------|----------------|--------------|
| Vente enregistrée | "Vente : 3 500 XAF — Article X" | Propriétaire |
| Stock bas (< seuil bas) | "Stock bas : Huile Palme (5 unités restantes)" | Propriétaire + Gérant |
| Rupture (= 0) | "RUPTURE : Sucre 1 kg — réapprovisionner" | Propriétaire + Gérant |
| Rapport journalier | "Récapitulatif du jour : X ventes, Y XAF" | Propriétaire |

**Infrastructure requise :**
- Service Worker enregistré dans l'app React (Vite PWA plugin).
- Clés VAPID générées côté Django.
- Subscriptions stockées dans Supabase (`push_subscriptions` table).
- Django envoie les pushes via `web-push` ou `pywebpush`.

---

### 1.3 Email / SMS (propriétaire à distance)

| Canal | Cas d'usage | Outil recommandé | Priorité |
|-------|------------|-----------------|----------|
| Email | Rapport journalier, alertes critiques | Resend (gratuit 3 000/mois) ou SMTP Django | Moyenne |
| SMS | Alerte rupture urgente | Twilio, Orange API Gabon, ou Hub2 | Basse (coût variable) |

> Pour la phase initiale, l'email via Resend est suffisant et économique. Le SMS peut être ajouté en phase 2 si le propriétaire n'a pas accès à internet en permanence.

---

## 2. Outils open source recommandés

### 2.1 In-app — React Toast / Notifications

#### react-hot-toast
- **GitHub** : https://github.com/timolins/react-hot-toast
- **Licence** : MIT
- **Ce qu'il résout** : Toasts légers, personnalisables, accessibles. API minimaliste (`toast.success()`, `toast.error()`, `toast.custom()`). 3 KB gzip.
- **Intégration React** : `<Toaster />` dans `App.tsx`, appels depuis n'importe quel composant ou service.
- **Intégration Django** : Aucune — frontend uniquement. Déclenché par réponse API.
- **Verdict** : **Recommandé** — le plus simple et le plus léger pour ce projet.

#### sonner
- **GitHub** : https://github.com/emilkowalski/sonner
- **Licence** : MIT
- **Ce qu'il résout** : Toasts modernes façon "stacked", compatible React 18+, animation fluide.
- **Intégration React** : `<Toaster />` + `toast()`. Compatible Tailwind CSS.
- **Verdict** : **Alternatif** — plus moderne visuellement, légèrement plus lourd.

#### react-toastify
- **GitHub** : https://github.com/fkhadra/react-toastify
- **Licence** : MIT
- **Ce qu'il résout** : Toast historiquement populaire, nombreuses options de position, progression visuelle.
- **Verdict** : **Alternatif** — fonctionnel mais API plus verbeuse que react-hot-toast.

---

### 2.2 Push Notifications PWA

#### vite-plugin-pwa
- **GitHub** : https://github.com/vite-pwa/vite-plugin-pwa
- **Licence** : MIT
- **Ce qu'il résout** : Génère automatiquement le Service Worker, le manifest PWA, et expose les hooks `useRegisterSW` / `usePWA` pour gérer la subscription push.
- **Intégration React** : Plugin Vite + `virtual:pwa-register/react`.
- **Intégration Django** : Le Service Worker côté frontend reçoit les pushes envoyés par Django.
- **Verdict** : **Recommandé** — standard de facto pour PWA avec Vite.

#### pywebpush (Django backend)
- **GitHub** : https://github.com/web-push-libs/pywebpush
- **Licence** : MPL-2.0
- **Ce qu'il résout** : Envoi de Web Push depuis Python/Django avec clés VAPID.
- **Intégration Django** : `pip install pywebpush` — utilisé dans une tâche Celery ou une view Django.
- **Verdict** : **Recommandé** — bibliothèque de référence pour Web Push en Python.

---

### 2.3 Temps réel — Synchronisation stock

#### Supabase Realtime
- **GitHub** : https://github.com/supabase/realtime
- **Licence** : Apache 2.0
- **Ce qu'il résout** : Écoute les changements de la table `products` en temps réel via WebSocket (PostgreSQL NOTIFY). Déclenche les alertes in-app sans polling.
- **Intégration React** : `supabase.channel('stock').on('postgres_changes', ...)`.
- **Verdict** : **Recommandé** — déjà dans la stack, zéro infrastructure supplémentaire.

---

### 2.4 Notifications programmatiques (état global)

#### Zustand
- **GitHub** : https://github.com/pmndrs/zustand
- **Licence** : MIT
- **Ce qu'il résout** : Store global léger pour gérer l'état des notifications (liste d'alertes, compteur de badges, file d'attente).
- **Intégration React** : Hook `useNotificationStore()` consommé par n'importe quel composant.
- **Verdict** : **Recommandé** si le projet utilise déjà Zustand pour d'autres stores.

---

### 2.5 Email (propriétaire distant)

#### Resend
- **Site** : https://resend.com — SDK Python : https://github.com/resendlabs/resend-python
- **Licence** : MIT (SDK)
- **Ce qu'il résout** : API email simple (REST), 3 000 emails/mois gratuits, templates HTML.
- **Intégration Django** : `pip install resend` + clé API en variable d'environnement.
- **Verdict** : **Recommandé** — gratuit pour le volume attendu, très simple.

---

## 3. Comparaison tableau

| Outil | Catégorie | Taille | Licence | Complexité setup | Temps réel | Hors ligne |
|-------|-----------|--------|---------|-----------------|------------|-----------|
| react-hot-toast | Toast in-app | 3 KB | MIT | Très faible | Non (déclenché manuellement) | N/A |
| sonner | Toast in-app | 5 KB | MIT | Très faible | Non | N/A |
| vite-plugin-pwa | PWA / Push | - | MIT | Moyenne | Oui (Service Worker) | Oui |
| pywebpush | Push backend | - | MPL-2.0 | Moyenne | Oui | N/A |
| Supabase Realtime | Temps réel BDD | inclus | Apache 2.0 | Faible (déjà dans stack) | Oui (WebSocket) | Non |
| Zustand | État global | 2 KB | MIT | Faible | Non (état local) | N/A |
| Resend | Email | - | MIT | Faible | Non | N/A |

---

## 4. Plan d'implémentation

### Phase 1 — In-app notifications (Semaine 1)

```
[ ] Installer react-hot-toast
[ ] Créer un service notificationService.ts (wrapper)
[ ] Définir les seuils d'alerte (stock_low_threshold, stock_critical_threshold) dans Supabase
[ ] Connecter Supabase Realtime pour écouter les changements de la table products
[ ] Déclencher toast warning quand stock <= seuil bas
[ ] Déclencher toast error (persistant) quand stock == 0
[ ] Afficher badge numérique sur l'icône "Stock" dans la navbar
[ ] Toast success à chaque vente confirmée côté caissier
```

### Phase 2 — PWA Push Notifications (Semaine 2-3)

```
[ ] Configurer vite-plugin-pwa dans vite.config.ts
[ ] Générer les clés VAPID (commande web-push generate-vapid-keys)
[ ] Créer la table push_subscriptions dans Supabase
[ ] Implémenter l'API Django : POST /api/push/subscribe
[ ] Demander la permission push à l'utilisateur (gérant / propriétaire)
[ ] Stocker la subscription en base
[ ] Créer la tâche Django (Celery ou signal post_save) qui envoie le push via pywebpush
[ ] Tester sur mobile Android (Chrome) et iOS (Safari 16.4+)
```

### Phase 3 — Email propriétaire (Semaine 4, optionnel)

```
[ ] Installer Resend SDK (pip install resend)
[ ] Configurer RESEND_API_KEY en variable d'environnement
[ ] Créer template email HTML pour alerte stock et rapport journalier
[ ] Déclencher l'email via signal Django ou tâche Celery planifiée
[ ] Tester la réception
```

---

## 5. Exemple de code

### 5.1 Installation

```bash
npm install react-hot-toast
# ou
bun add react-hot-toast
```

### 5.2 Configuration du Toaster dans App.tsx

```tsx
// src/App.tsx
import { Toaster } from 'react-hot-toast'

export default function App() {
  return (
    <>
      {/* ... routes, providers ... */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'var(--font-sans)',
            fontSize: '0.875rem',
          },
        }}
      />
    </>
  )
}
```

### 5.3 Service de notifications (notificationService.ts)

```ts
// src/services/notificationService.ts
import toast from 'react-hot-toast'

export const STOCK_LOW_THRESHOLD = 10
export const STOCK_CRITICAL_THRESHOLD = 3

export interface StockAlert {
  productName: string
  currentStock: number
  unit: string
}

export const notificationService = {
  saleCofirmed: (total: number, currency = 'XAF') => {
    toast.success(`Vente enregistrée : ${total.toLocaleString('fr-FR')} ${currency}`, {
      duration: 3500,
      icon: '🧾',
    })
  },

  stockLow: (alert: StockAlert) => {
    toast(`Stock bas — ${alert.productName} : ${alert.currentStock} ${alert.unit} restant(e)s`, {
      icon: '⚠️',
      duration: 6000,
      style: {
        background: '#FEF3C7',
        color: '#92400E',
        border: '1px solid #F59E0B',
      },
    })
  },

  stockCritical: (alert: StockAlert) => {
    toast.error(
      `STOCK CRITIQUE — ${alert.productName} : ${alert.currentStock} ${alert.unit}. Réapprovisionner !`,
      {
        duration: Infinity, // persiste jusqu'à fermeture manuelle
        icon: '🚨',
        style: {
          background: '#FEE2E2',
          color: '#991B1B',
          border: '1px solid #EF4444',
          maxWidth: '420px',
        },
      }
    )
  },

  stockOut: (productName: string) => {
    toast.error(`RUPTURE DE STOCK — ${productName}`, {
      duration: Infinity,
      icon: '❌',
    })
  },

  syncError: (message = 'Erreur de synchronisation. Vérifiez votre connexion.') => {
    toast.error(message, { duration: 8000 })
  },
}
```

### 5.4 Hook Supabase Realtime — écoute des alertes stock (useStockAlerts.ts)

```ts
// src/hooks/useStockAlerts.ts
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { notificationService, STOCK_LOW_THRESHOLD, STOCK_CRITICAL_THRESHOLD } from '@/services/notificationService'

interface ProductRow {
  id: string
  name: string
  stock_quantity: number
  unit: string
}

export function useStockAlerts() {
  useEffect(() => {
    const channel = supabase
      .channel('stock-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
        },
        (payload) => {
          const product = payload.new as ProductRow
          const { name, stock_quantity, unit } = product

          if (stock_quantity === 0) {
            notificationService.stockOut(name)
          } else if (stock_quantity <= STOCK_CRITICAL_THRESHOLD) {
            notificationService.stockCritical({ productName: name, currentStock: stock_quantity, unit })
          } else if (stock_quantity <= STOCK_LOW_THRESHOLD) {
            notificationService.stockLow({ productName: name, currentStock: stock_quantity, unit })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
```

### 5.5 Utilisation dans le composant racine ou layout

```tsx
// src/components/layout/RootLayout.tsx
import { useStockAlerts } from '@/hooks/useStockAlerts'

export function RootLayout({ children }: { children: React.ReactNode }) {
  // Active l'écoute temps réel des alertes stock pour toute la session
  useStockAlerts()

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar, Sidebar, etc. */}
      {children}
    </div>
  )
}
```

### 5.6 Déclenchement manuel après une vente (SaleConfirmButton.tsx)

```tsx
// src/components/pos/SaleConfirmButton.tsx
import { useState } from 'react'
import { notificationService } from '@/services/notificationService'
import { recordSale } from '@/services/saleService'

interface Props {
  cartTotal: number
  onSuccess: () => void
}

export function SaleConfirmButton({ cartTotal, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await recordSale(cartTotal)
      notificationService.saleCofirmed(cartTotal)
      onSuccess()
    } catch {
      notificationService.syncError('Échec de l\'enregistrement de la vente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={isLoading || cartTotal === 0}
      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
    >
      {isLoading ? 'Enregistrement...' : `Valider — ${cartTotal.toLocaleString('fr-FR')} XAF`}
    </button>
  )
}
```

---

## Références

- [react-hot-toast docs](https://react-hot-toast.com/)
- [vite-plugin-pwa docs](https://vite-pwa-org.netlify.app/)
- [Supabase Realtime docs](https://supabase.com/docs/guides/realtime)
- [pywebpush](https://github.com/web-push-libs/pywebpush)
- [Web Push Protocol (MDN)](https://developer.mozilla.org/fr/docs/Web/API/Push_API)
- [Resend Python SDK](https://resend.com/docs/send-with-python)
