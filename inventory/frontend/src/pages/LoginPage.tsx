import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  Eye,
  EyeOff,
  Loader2,
  BarChart2,
  ScanLine,
  Receipt,
  Users,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DemoAccount {
  name: string;
  username: string;
  password: string;
  roleLabel: string;
  avatarBg: string;
  initials: string;
}

interface Feature {
  icon: React.ElementType;
  label: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Admin Principal",
    username: "admin",
    password: "Admin1234!",
    roleLabel: "Admin",
    avatarBg: "#4f46e5",
    initials: "AP",
  },
  {
    name: "Marie Koumba",
    username: "vendeur1",
    password: "Vendeur1234!",
    roleLabel: "Vendeur",
    avatarBg: "#7c3aed",
    initials: "MK",
  },
  {
    name: "Paul Moussavou",
    username: "vendeur2",
    password: "Vendeur1234!",
    roleLabel: "Vendeur",
    avatarBg: "#9333ea",
    initials: "PM",
  },
];

const FEATURES: Feature[] = [
  { icon: BarChart2, label: "Tableau de bord en temps réel" },
  { icon: ScanLine,  label: "Scanner code-barres intégré" },
  { icon: Receipt,   label: "Facturation automatique" },
  { icon: Users,     label: "Multi-utilisateurs & rôles" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch {
      setError("Identifiants incorrects. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loginAs(u: string, p: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(u, p);
      navigate("/dashboard");
    } catch {
      setError("Identifiants incorrects. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* ═══════════════════════════════════════════════════════
          LEFT BRAND PANEL — desktop only (md+)
      ═══════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden"
        style={{
          width: "50%",
          background: "linear-gradient(160deg, #0f0c29 0%, #1a1046 50%, #200f3c 100%)",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.07) 1px, transparent 1px)," +
              "linear-gradient(90deg, rgba(99,102,241,0.07) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Decorative bottom-right glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 rounded-full blur-3xl"
          style={{
            width: "24rem",
            height: "24rem",
            background: "rgba(99,102,241,0.09)",
            transform: "translate(50%, 50%)",
          }}
        />

        {/* Top — logo */}
        <div className="relative flex items-center gap-3">
          <div
            className="rounded-xl p-2.5 flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)" }}
          >
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white tracking-widest leading-none">
              INVENTORY
            </p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(165,180,252,0.7)" }}>
              Gestion de stock &amp; ventes
            </p>
          </div>
        </div>

        {/* Middle — feature list */}
        <div className="relative space-y-4">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(99,102,241,0.2)" }}
              >
                <Icon className="w-4 h-4" style={{ color: "#a5b4fc" }} />
              </div>
              <span className="text-sm" style={{ color: "#cbd5e1" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom — copyright */}
        <p className="relative text-xs" style={{ color: "#475569" }}>
          © 2025 NAOSERVICES · MPJ HIGH-TECH
        </p>
      </aside>

      {/* ═══════════════════════════════════════════════════════
          MOBILE HEADER — visible below md
      ═══════════════════════════════════════════════════════ */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-10 flex items-center gap-3 px-6 py-5"
        style={{
          background: "linear-gradient(135deg, #1e1b4b, #2e1065)",
        }}
      >
        <div
          className="rounded-xl p-2 flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)" }}
        >
          <Package className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-white tracking-widest text-base leading-none">
            INVENTORY
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#a5b4fc" }}>
            Gestion de stock &amp; ventes
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          RIGHT FORM PANEL
      ═══════════════════════════════════════════════════════ */}
      <main className="flex flex-1 items-center justify-center bg-background p-6 pt-24 md:pt-6 md:border-l border-border">
        <div className="w-full max-w-sm space-y-6">

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bon retour !</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connectez-vous à votre espace
            </p>
          </div>

          {/* ── Form card ── */}
          <div className="bg-card rounded-xl border shadow p-6 space-y-4">
            <form onSubmit={handleLogin} className="space-y-4" noValidate>

              {/* Username field */}
              <div>
                <Label
                  htmlFor="username"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >
                  Identifiant
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  className="h-11 rounded-lg"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isSubmitting}
                  autoComplete="username"
                  autoFocus
                />
              </div>

              {/* Password field */}
              <div>
                <Label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe"
                    className="h-11 rounded-lg pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={
                      showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg p-3 text-sm text-destructive bg-destructive/10">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="h-11 w-full font-semibold text-white border-0 shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-200"
                style={{
                  background: isSubmitting
                    ? "rgba(99,102,241,0.5)"
                    : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion en cours…
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </div>

          {/* ── Demo accounts ── */}
          <div>
            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Accès rapide
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => loginAs(account.username, account.password)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {/* Colored avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: account.avatarBg }}
                  >
                    {account.initials}
                  </div>

                  {/* Name + credentials */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {account.name}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {account.username} / {account.password}
                    </p>
                  </div>

                  {/* Role pill */}
                  <span
                    className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide text-white"
                    style={{ background: account.avatarBg }}
                  >
                    {account.roleLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
