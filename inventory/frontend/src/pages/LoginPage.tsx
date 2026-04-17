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
  ShieldCheck,
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
  colorVar: "primary" | "accent";
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
    colorVar: "primary",
    initials: "AP",
  },
  {
    name: "Marie Koumba",
    username: "vendeur1",
    password: "Vendeur1234!",
    roleLabel: "Vendeur",
    colorVar: "accent",
    initials: "MK",
  },
  {
    name: "Paul Moussavou",
    username: "vendeur2",
    password: "Vendeur1234!",
    roleLabel: "Vendeur",
    colorVar: "accent",
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
          Palette : charbon chaud africain — cuivre / ambre / or
      ═══════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden"
        style={{
          width: "50%",
          background: "linear-gradient(160deg, hsl(20 22% 5%) 0%, hsl(25 20% 9%) 50%, hsl(30 16% 13%) 100%)",
        }}
      >
        {/* Subtle warm grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 login-grid-overlay"
          style={{ opacity: 0.4 }}
        />

        {/* Orb cuivre — top-left */}
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full blur-3xl"
          style={{
            width: "22rem",
            height: "22rem",
            background: "radial-gradient(circle, rgba(190,90,30,0.13) 0%, transparent 70%)",
            top: 0,
            left: 0,
            transform: "translateX(-40%) translateY(-40%)",
            animation: "floatY 7s ease-in-out infinite",
            animationDelay: "1.5s",
          }}
        />

        {/* Orb or/ambre — bottom-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 rounded-full blur-3xl"
          style={{
            width: "28rem",
            height: "28rem",
            background: "radial-gradient(circle, rgba(200,140,40,0.10) 0%, rgba(180,80,20,0.07) 50%, transparent 70%)",
            transform: "translate(45%, 45%)",
            animation: "floatY 5s ease-in-out infinite, pulseGlow 4s ease-in-out infinite",
          }}
        />

        {/* Orb vert forêt — center-right (subtil) */}
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full blur-3xl"
          style={{
            width: "14rem",
            height: "14rem",
            background: "radial-gradient(circle, rgba(50,120,70,0.07) 0%, transparent 70%)",
            top: "40%",
            right: "-2rem",
            animation: "floatY 9s ease-in-out infinite",
            animationDelay: "3s",
          }}
        />

        {/* Grille de points — top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-8 right-8 grid gap-2"
          style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
        >
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full"
              style={{ background: "rgba(200,140,60,0.12)" }}
            />
          ))}
        </div>

        {/* Ligne de scan cuivrée */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0"
          style={{ top: "44%", height: "1px", opacity: 0.15 }}
        >
          <div
            style={{
              height: "100%",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(200,140,40,0.5) 35%, rgba(210,160,60,0.95) 50%, rgba(200,140,40,0.5) 65%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 3.5s linear infinite",
            }}
          />
        </div>

        {/* Ligne décorative horizontale fine */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-10 right-10"
          style={{
            top: "44.2%",
            height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(200,140,40,0.08) 50%, transparent 100%)",
          }}
        />

        {/* Top — logo + wordmark */}
        <div className="relative flex items-center gap-3">
          <div
            className="rounded-xl p-2.5 flex items-center justify-center shrink-0 shadow-lg"
            style={{
              background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 50%))",
              boxShadow: "0 4px 20px rgba(190,100,30,0.35)",
            }}
          >
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white tracking-widest leading-none flex">
              {"INVENTORY".split("").map((letter, i) => (
                <span
                  key={i}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${i * 60}ms`,
                    opacity: 0,
                    animationFillMode: "forwards",
                  }}
                >
                  {letter}
                </span>
              ))}
            </p>
            <p
              className="text-xs mt-0.5 animate-fade-in-left animate-delay-200 font-medium tracking-wide"
              style={{ color: "rgba(200,155,80,0.75)" }}
            >
              Gestion de stock &amp; ventes
            </p>
          </div>
        </div>

        {/* Middle — feature list */}
        <div className="relative space-y-4">
          {FEATURES.map(({ icon: Icon, label }, i) => (
            <div
              key={label}
              className="flex items-center gap-3 animate-fade-in-left"
              style={{
                animationDelay: `${i * 100 + 300}ms`,
                opacity: 0,
                animationFillMode: "forwards",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(190,100,30,0.14)",
                  border: "1px solid rgba(200,130,40,0.18)",
                }}
              >
                <Icon className="w-4 h-4" style={{ color: "rgba(210,155,75,0.9)" }} />
              </div>
              <span className="text-sm font-medium" style={{ color: "rgba(220,200,170,0.82)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom — badge sécurité + copyright */}
        <div className="relative flex items-center justify-between">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "rgba(190,100,30,0.12)",
              border: "1px solid rgba(200,130,40,0.2)",
              color: "rgba(210,155,75,0.8)",
            }}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Connexion sécurisée</span>
          </div>
          <p className="text-xs" style={{ color: "rgba(160,130,90,0.5)" }}>
            © 2026 NAOSERVICES · MPJ HIGH-TECH
          </p>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════
          MOBILE HEADER — visible below md
      ═══════════════════════════════════════════════════════ */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-10 flex items-center gap-3 px-6 py-5"
        style={{
          background: "linear-gradient(135deg, hsl(20 22% 6%), hsl(25 20% 10%))",
          borderBottom: "1px solid rgba(200,130,40,0.15)",
        }}
      >
        <div
          className="relative group overflow-hidden rounded-xl p-2 flex items-center justify-center shrink-0 shadow-md"
          style={{ background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 50%))" }}
        >
          <Package className="w-4 h-4 text-white" />
          <span
            aria-hidden
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
          />
        </div>
        <div>
          <p className="font-bold text-white tracking-widest text-base leading-none">
            INVENTORY
          </p>
          <p className="text-xs mt-0.5 font-medium" style={{ color: "rgba(200,155,80,0.75)" }}>
            Gestion de stock &amp; ventes
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          RIGHT FORM PANEL
      ═══════════════════════════════════════════════════════ */}
      <main className="flex flex-1 items-center justify-center bg-background p-6 pt-24 md:pt-6 md:border-l border-border">
        <div className="w-full max-w-sm space-y-6 backdrop-blur-sm">

          {/* Heading */}
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold tracking-tight">Bon retour !</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connectez-vous à votre espace
            </p>
          </div>

          {/* ── Form card ── */}
          <div className="bg-card rounded-xl border shadow-sm p-6 space-y-4 animate-form-entrance animate-delay-100">
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
                  className="h-11 rounded-lg border-border/60 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)] focus-visible:border-[hsl(var(--primary)/0.5)]"
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
                    className="h-11 rounded-lg pr-10 border-border/60 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/50"
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
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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

              {/* Submit button — gradient thème */}
              <Button
                type="submit"
                className="h-11 w-full font-semibold text-white border-0 shadow-md hover:brightness-110 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                style={
                  isSubmitting
                    ? {
                        background: "linear-gradient(135deg, hsl(var(--primary) / 0.7), hsl(var(--accent) / 0.7))",
                        boxShadow: "none",
                        cursor: "wait",
                      }
                    : {
                        background: "linear-gradient(-45deg, hsl(var(--primary)), hsl(var(--accent)), hsl(22 80% 58%), hsl(var(--primary)))",
                        backgroundSize: "300% 300%",
                        animation: "gradientShift 4s ease infinite",
                        boxShadow: "0 4px 18px hsl(var(--primary) / 0.3)",
                      }
                }
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
          <div className="space-y-3 animate-fade-in-up animate-delay-400">
            {/* Divider */}
            <div className="flex items-center gap-3">
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
                  className="group w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/50 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    ["--hover-border" as string]: "hsl(var(--primary) / 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = `hsl(var(--primary) / 0.3)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "";
                  }}
                >
                  {/* Avatar couleur thème */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: `hsl(var(--${account.colorVar}))` }}
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

                  {/* Role pill couleur thème */}
                  <span
                    className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide text-white"
                    style={{ background: `hsl(var(--${account.colorVar}))` }}
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
