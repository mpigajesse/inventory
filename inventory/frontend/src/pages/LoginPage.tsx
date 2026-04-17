import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Store,
  BarChart3,
  Zap,
  Package,
  TrendingUp,
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

interface HeroFeature {
  icon: React.ElementType;
  label: string;
  desc: string;
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

const HERO_FEATURES: HeroFeature[] = [
  { icon: Zap,        label: "Ventes en temps réel",   desc: "POS + caisse intégrée" },
  { icon: Package,    label: "Gestion de stock",        desc: "Alertes automatiques" },
  { icon: TrendingUp, label: "Statistiques avancées",  desc: "KPIs & rapports" },
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
    <div className="min-h-screen flex">

      {/* ═══════════════════════════════════════════════════════
          CÔTÉ GAUCHE — HERO BRAND (desktop uniquement)
      ═══════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-12"
        style={{
          background: "linear-gradient(145deg, hsl(20 30% 8%) 0%, hsl(22 26% 13%) 50%, hsl(24 22% 16%) 100%)",
        }}
      >
        {/* Pattern géométrique africain */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.04,
            backgroundImage: `
              repeating-linear-gradient(45deg,  hsl(22 72% 48%) 0px, hsl(22 72% 48%) 1px, transparent 1px, transparent 20px),
              repeating-linear-gradient(-45deg, hsl(22 72% 48%) 0px, hsl(22 72% 48%) 1px, transparent 1px, transparent 20px)
            `,
          }}
        />

        {/* Orbe cuivre — centre-gauche */}
        <div
          aria-hidden
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsl(22 72% 48% / 0.12) 0%, transparent 70%)",
          }}
        />

        {/* Orbe vert forêt — bas-droite */}
        <div
          aria-hidden
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsl(152 38% 38% / 0.10) 0%, transparent 70%)",
          }}
        />

        {/* Grille de points décorative — top-right */}
        <div
          aria-hidden
          className="absolute top-8 right-8 grid gap-2.5 pointer-events-none"
          style={{ gridTemplateColumns: "repeat(6, 1fr)" }}
        >
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full"
              style={{ background: "hsl(22 72% 48% / 0.18)" }}
            />
          ))}
        </div>

        {/* ── Logo (haut) ── */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg"
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                boxShadow: "0 4px 20px hsl(22 72% 48% / 0.40)",
              }}
            >
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg tracking-widest leading-none">
                NAOSERVICES
              </p>
              <p className="text-xs mt-0.5" style={{ color: "hsl(22 72% 65% / 0.70)" }}>
                Système de Gestion de Stock
              </p>
            </div>
          </div>
        </div>

        {/* ── Contenu central ── */}
        <div className="relative z-10 flex flex-col justify-center flex-1 py-12">
          {/* Icône principale avec glow */}
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8"
            style={{
              background: "linear-gradient(135deg, hsl(22 72% 48% / 0.20), hsl(36 88% 52% / 0.10))",
              border: "1px solid hsl(22 72% 48% / 0.30)",
              boxShadow: "0 0 60px hsl(22 72% 48% / 0.15)",
            }}
          >
            <BarChart3 className="w-12 h-12" style={{ color: "hsl(22 72% 65%)" }} />
          </div>

          <h1
            className="text-[2.6rem] font-extrabold text-white leading-tight mb-4"
            style={{ letterSpacing: "-0.03em" }}
          >
            Gérez votre<br />
            <span
              style={{
                background: "linear-gradient(135deg, hsl(22 72% 62%), hsl(36 88% 68%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              stock &amp; ventes
            </span>
          </h1>

          <p
            className="text-base leading-relaxed max-w-sm mb-10"
            style={{ color: "hsl(30 20% 75% / 0.55)" }}
          >
            Tableau de bord complet pour piloter votre commerce en temps réel
            depuis n'importe où.
          </p>

          {/* Feature cards */}
          <div className="space-y-3">
            {HERO_FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "linear-gradient(135deg, hsl(22 72% 48% / 0.30), hsl(22 72% 48% / 0.10))",
                  }}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: "hsl(22 72% 68%)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "hsl(30 20% 90% / 0.90)" }}>
                    {label}
                  </p>
                  <p className="text-xs" style={{ color: "hsl(30 20% 75% / 0.40)" }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer gauche ── */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full bg-emerald-400"
              style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
            />
            <p className="text-xs" style={{ color: "hsl(30 20% 75% / 0.35)" }}>
              MPJ HIGH-TECH × Naoservices — Libreville, Gabon
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "rgba(190,100,30,0.10)",
              border: "1px solid rgba(200,130,40,0.20)",
              color: "hsl(36 88% 65% / 0.75)",
            }}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Connexion sécurisée</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          CÔTÉ DROIT — FORMULAIRE
      ═══════════════════════════════════════════════════════ */}
      <div
        className="flex-1 lg:w-[45%] flex items-center justify-center p-6 lg:p-12"
        style={{ background: "hsl(30 18% 97%)" }}
      >
        <div className="w-full max-w-md">

          {/* Header du formulaire */}
          <div className="mb-8">
            {/* Logo mobile uniquement */}
            <div className="flex items-center gap-2.5 mb-8 lg:hidden">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
                style={{
                  background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                  boxShadow: "0 4px 14px hsl(22 72% 48% / 0.30)",
                }}
              >
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-foreground tracking-widest text-base leading-none">
                  NAOSERVICES
                </p>
                <p className="text-xs mt-0.5" style={{ color: "hsl(22 72% 48%)" }}>
                  Gestion de stock &amp; ventes
                </p>
              </div>
            </div>

            <h2
              className="text-[2rem] font-extrabold text-foreground mb-1"
              style={{ letterSpacing: "-0.025em" }}
            >
              Bon retour&nbsp;👋
            </h2>
            <p className="text-sm text-muted-foreground">
              Connectez-vous à votre espace de gestion
            </p>
          </div>

          {/* ── Formulaire ── */}
          <form onSubmit={handleLogin} className="space-y-5" noValidate>

            {/* Username */}
            <div>
              <Label
                htmlFor="username"
                className="block text-sm font-semibold text-foreground mb-1.5"
              >
                Identifiant
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                className="w-full h-11 px-4 rounded-xl border-[1.5px] bg-card transition-all duration-200 focus-visible:ring-2 outline-none"
                style={
                  {
                    "--tw-ring-color": "hsl(22 72% 48% / 0.20)",
                    borderColor: "hsl(var(--border))",
                  } as React.CSSProperties
                }
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "hsl(22 72% 48% / 0.65)";
                  e.currentTarget.style.boxShadow   = "0 0 0 3px hsl(22 72% 48% / 0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "";
                  e.currentTarget.style.boxShadow   = "";
                }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password */}
            <div>
              <Label
                htmlFor="password"
                className="block text-sm font-semibold text-foreground mb-1.5"
              >
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  className="w-full h-11 px-4 pr-11 rounded-xl border-[1.5px] bg-card transition-all duration-200 outline-none"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "hsl(22 72% 48% / 0.65)";
                    e.currentTarget.style.boxShadow   = "0 0 0 3px hsl(22 72% 48% / 0.12)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "";
                    e.currentTarget.style.boxShadow   = "";
                  }}
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

            {/* Bannière d'erreur */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Bouton submit premium */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:brightness-100 disabled:opacity-60 disabled:cursor-wait disabled:translate-y-0"
              style={
                isSubmitting
                  ? {
                      background: "linear-gradient(135deg, hsl(22 72% 48% / 0.70), hsl(36 88% 52% / 0.70))",
                      boxShadow: "none",
                    }
                  : {
                      background: "linear-gradient(135deg, hsl(22 72% 48%), hsl(36 88% 52%))",
                      boxShadow: "0 4px 14px hsl(22 72% 48% / 0.35)",
                    }
              }
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion en cours…
                </span>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          {/* ── Accès rapide (comptes démo) ── */}
          <div className="mt-8 space-y-3">
            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground whitespace-nowrap px-1">
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
                  className="group w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(22 72% 48% / 0.30)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "";
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: `hsl(var(--${account.colorVar}))` }}
                  >
                    {account.initials}
                  </div>

                  {/* Nom + identifiants */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {account.name}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {account.username} / {account.password}
                    </p>
                  </div>

                  {/* Badge rôle */}
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

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            © 2025 MPJ HIGH-TECH × Naoservices
          </p>
        </div>
      </div>
    </div>
  );
}
