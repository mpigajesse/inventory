import { useOutletContext, useNavigate } from "react-router-dom";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Info,
  Users,
  Package,
  ShoppingCart,
  Calendar,
  Tag,
  ShoppingBag,
  LogIn,
  Settings,
  UserCog,
  ExternalLink,
  Activity,
  ArrowRight,
  Database,
  KeyRound,
  UserX,
  RefreshCcw,
} from "lucide-react";
import { useState } from "react";
import type { AppLayoutContext } from "@/components/layout/AppLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = "admin" | "vendeur";
type UserStatus = "active" | "inactive";

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
}

type ActivityType = "login" | "sale" | "product" | "stock" | "system";

interface ActivityEntry {
  id: string;
  type: ActivityType;
  description: string;
  user: string;
  timestamp: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const SYSTEM_INFO = {
  version: "1.0.0",
  installDate: "01/04/2026",
  activeUsers: 3,
  totalProducts: 142,
  monthlyTransactions: 698,
};

const INITIAL_USERS: AdminUser[] = [
  { id: 1, name: "Admin Principal", email: "admin@naoservices.ga", role: "admin", status: "active", lastLogin: "14/04/2026 08:30" },
  { id: 2, name: "Fatou Mbaye", email: "fatou@naoservices.ga", role: "vendeur", status: "active", lastLogin: "14/04/2026 09:00" },
  { id: 3, name: "Moussa Diallo", email: "moussa@naoservices.ga", role: "vendeur", status: "active", lastLogin: "13/04/2026 18:45" },
  { id: 4, name: "Aïcha Nkoghe", email: "aicha@naoservices.ga", role: "vendeur", status: "inactive", lastLogin: "10/04/2026 12:00" },
];

const RECENT_ACTIVITY: ActivityEntry[] = [
  { id: "log-01", type: "sale", description: "Vente VNT-005 enregistrée — 56 500 FCFA (4 articles)", user: "Fatou Mbaye", timestamp: "14/04/2026 14:20" },
  { id: "log-02", type: "login", description: "Connexion au système", user: "Admin Principal", timestamp: "14/04/2026 08:30" },
  { id: "log-03", type: "product", description: "Nouveau produit ajouté : Eau Tangui 1.5L", user: "Admin Principal", timestamp: "14/04/2026 08:45" },
  { id: "log-04", type: "sale", description: "Vente VNT-004 enregistrée — 23 000 FCFA (2 articles)", user: "Moussa Diallo", timestamp: "14/04/2026 13:08" },
  { id: "log-05", type: "stock", description: "Stock mis à jour : Lait Nido 400g → 3 unités", user: "Admin Principal", timestamp: "14/04/2026 11:30" },
  { id: "log-06", type: "login", description: "Connexion au système", user: "Fatou Mbaye", timestamp: "14/04/2026 09:00" },
  { id: "log-07", type: "product", description: "Produit modifié : Huile Dinor 1L — prix mis à jour", user: "Admin Principal", timestamp: "13/04/2026 17:00" },
  { id: "log-08", type: "sale", description: "Vente VNT-003 enregistrée — 78 000 FCFA (5 articles)", user: "Moussa Diallo", timestamp: "13/04/2026 15:30" },
  { id: "log-09", type: "system", description: "Sauvegarde automatique des données", user: "Système", timestamp: "13/04/2026 12:00" },
  { id: "log-10", type: "login", description: "Connexion au système", user: "Moussa Diallo", timestamp: "13/04/2026 08:00" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-primary" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

const ACTIVITY_CONFIG: Record<ActivityType, { icon: React.ElementType; bg: string; color: string }> = {
  login: { icon: LogIn, bg: "bg-primary/10", color: "text-primary" },
  sale: { icon: ShoppingBag, bg: "bg-success/10", color: "text-success" },
  product: { icon: Tag, bg: "bg-warning/10", color: "text-warning" },
  stock: { icon: Package, bg: "bg-info/10 bg-primary/10", color: "text-primary" },
  system: { icon: Settings, bg: "bg-muted", color: "text-muted-foreground" },
};

function ActivityIcon({ type }: { type: ActivityType }) {
  const { icon: Icon, bg, color } = ACTIVITY_CONFIG[type];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const { onMenuClick } = useOutletContext<AppLayoutContext>();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUser[]>(INITIAL_USERS);
  const [disablingUser, setDisablingUser] = useState<AdminUser | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);

  function handleRoleChange(userId: number, newRole: UserRole) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  }

  function handleDisable() {
    if (!disablingUser) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === disablingUser.id ? { ...u, status: "inactive" as UserStatus } : u
      )
    );
    setDisablingUser(null);
  }

  return (
    <>
      <Topbar
        title="Administration"
        subtitle="Vue d'ensemble du système"
        onMenuClick={onMenuClick}
      />

      <div className="page-container animate-slide-in space-y-8">

        {/* ── Section : Informations système ── */}
        <section>
          <SectionHeader icon={Info} title="Informations système" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { icon: Tag, label: "Version", value: SYSTEM_INFO.version },
              { icon: Calendar, label: "Date d'installation", value: SYSTEM_INFO.installDate },
              { icon: Users, label: "Utilisateurs actifs", value: String(SYSTEM_INFO.activeUsers) },
              { icon: Package, label: "Produits en catalogue", value: String(SYSTEM_INFO.totalProducts) },
              { icon: ShoppingCart, label: "Transactions ce mois", value: String(SYSTEM_INFO.monthlyTransactions) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-card border rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground leading-tight">{label}</span>
                </div>
                <span className="text-lg font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section : Gestion des accès ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Gestion des accès</h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/users")}
              className="flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Gérer les utilisateurs
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="bg-card rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Dernière connexion</th>
                    <th className="w-48">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="text-muted-foreground">{user.email}</td>
                      <td>
                        <Select
                          value={user.role}
                          onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="vendeur">Vendeur</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td>
                        <StatusBadge
                          label={user.status === "active" ? "Actif" : "Inactif"}
                          variant={user.status === "active" ? "success" : "default"}
                        />
                      </td>
                      <td className="text-muted-foreground text-xs">{user.lastLogin}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            title="Désactiver"
                            onClick={() => setDisablingUser(user)}
                            disabled={user.status === "inactive"}
                          >
                            <UserX className="w-3.5 h-3.5" />
                            Désactiver
                          </button>
                          <button
                            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                            title="Réinitialiser le mot de passe"
                            onClick={() => setResetUser(user)}
                          >
                            <RefreshCcw className="w-3.5 h-3.5" />
                            MDP
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Section : Journal d'activité ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Journal d'activité</h2>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/admin/activity")}
              className="flex items-center gap-1.5"
            >
              Voir tout
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="space-y-3">
              {RECENT_ACTIVITY.map((entry, idx) => (
                <div key={entry.id} className="flex items-start gap-3">
                  {/* Ligne verticale de connexion sauf pour le dernier élément */}
                  <div className="flex flex-col items-center">
                    <ActivityIcon type={entry.type} />
                    {idx < RECENT_ACTIVITY.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1 min-h-[12px]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm font-medium leading-snug">{entry.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{entry.user}</span>
                      <span className="text-muted-foreground/40 text-xs">·</span>
                      <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section : Configuration avancée ── */}
        <section>
          <SectionHeader icon={Settings} title="Configuration avancée" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Lien vers paramètres */}
            <div className="bg-card border rounded-lg p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Paramètres de l'application</p>
                  <p className="text-xs text-muted-foreground">Nom de l'entreprise, adresse, NIF</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Configurez les informations de votre commerce : raison sociale, coordonnées, numéro fiscal.
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="self-start flex items-center gap-1.5">
                Ouvrir les paramètres
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Card Django Admin */}
            <div className="bg-card border rounded-lg p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-warning/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Panel Django Admin</p>
                  <p className="text-xs text-muted-foreground">Accès réservé à l'administrateur système</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Pour les opérations de base de données et la gestion des données techniques, utilisez le panel
                d'administration Django. Contactez votre administrateur système (Naoservices).
              </p>
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-warning/5 border border-warning/20">
                <KeyRound className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                <p className="text-xs text-warning/80">
                  Accès réservé à l'équipe technique Naoservices / MPJ HIGH-TECH.
                  Ne partagez jamais vos identifiants super-admin.
                </p>
              </div>
              <a
                href="#"
                className="self-start flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-input bg-background hover:bg-secondary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ouvrir le panel Django
              </a>
            </div>

          </div>
        </section>

      </div>

      {/* ── AlertDialog : Désactiver utilisateur ── */}
      <AlertDialog
        open={!!disablingUser}
        onOpenChange={(open) => { if (!open) setDisablingUser(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver le compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compte de <strong>{disablingUser?.name}</strong> sera désactivé.
              L'utilisateur ne pourra plus se connecter. Vous pourrez le réactiver depuis la page Utilisateurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDisable}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AlertDialog : Réinitialiser mot de passe ── */}
      <AlertDialog
        open={!!resetUser}
        onOpenChange={(open) => { if (!open) setResetUser(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réinitialiser le mot de passe ?</AlertDialogTitle>
            <AlertDialogDescription>
              Un mot de passe temporaire sera envoyé à <strong>{resetUser?.email}</strong>.
              Cette fonctionnalité nécessite une connexion au backend. (Non disponible en V1.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fermer</AlertDialogCancel>
            <AlertDialogAction onClick={() => setResetUser(null)}>
              Compris
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
