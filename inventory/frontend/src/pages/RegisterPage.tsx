import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  Eye,
  EyeOff,
  Loader2,
  Building2,
  UserPlus,
  Lock,
  Mail,
  User,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

// ─── Features panel ───────────────────────────────────────────────────────────

interface PanelFeature {
  icon: React.ElementType;
  label: string;
  sub: string;
}

const PANEL_FEATURES: PanelFeature[] = [
  { icon: Building2, label: "Gestion multi-boutiques", sub: "Organisez plusieurs points de vente" },
  { icon: UserPlus,  label: "Rôles & permissions",     sub: "Admins, vendeurs, accès granulaire" },
  { icon: Package,   label: "Stock en temps réel",      sub: "Alertes seuil, historique complet" },
  { icon: Lock,      label: "Données sécurisées",        sub: "Chiffrement JWT + HTTPS" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting] = useState(false);

  return (
    <div className="flex min-h-screen">

      {/* ═══════════════════════════════════════════════════════
          LEFT BRAND PANEL — desktop only (md+)
          Même fond sombre africain que LoginPage
      ═══════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden"
        style={{
          width: "46%",
          background: "linear-gradient(160deg, hsl(20 22% 5%) 0%, hsl(25 20% 9%) 50%, hsl(30 16% 13%) 100%)",
        }}
      >
        {/* Warm grid overlay */}
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
            width: "20rem",
            height: "20rem",
            background: "radial-gradient(circle, rgba(190,90,30,0.14) 0%, transparent 70%)",
            top: 0,
            left: 0,
            transform: "translateX(-40%) translateY(-35%)",
            animation: "floatY 8s ease-in-out infinite",
            animationDelay: "0.8s",
          }}
        />

        {/* Orb or/ambre — bottom-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-0 rounded-full blur-3xl"
          style={{
            width: "26rem",
            height: "26rem",
            background: "radial-gradient(circle, rgba(200,140,40,0.10) 0%, rgba(180,80,20,0.07) 50%, transparent 70%)",
            transform: "translate(42%, 42%)",
            animation: "floatY 6s ease-in-out infinite, pulseGlow 5s ease-in-out infinite",
          }}
        />

        {/* Orb vert forêt gabonaise — milieu */}
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full blur-3xl"
          style={{
            width: "12rem",
            height: "12rem",
            background: "radial-gradient(circle, rgba(50,120,70,0.08) 0%, transparent 70%)",
            top: "38%",
            right: "-1rem",
            animation: "floatY 10s ease-in-out infinite",
            animationDelay: "2.5s",
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

        {/* Ligne de scan cuivrée animée */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0"
          style={{ top: "48%", height: "1px", opacity: 0.13 }}
        >
          <div
            style={{
              height: "100%",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(200,140,40,0.5) 35%, rgba(210,160,60,0.95) 50%, rgba(200,140,40,0.5) 65%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 4s linear infinite",
            }}
          />
        </div>

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
                    animationDelay: `${i * 55}ms`,
                    opacity: 0,
                    animationFillMode: "forwards",
                  }}
                >
                  {letter}
                </span>
              ))}
            </p>
            <p
              className="text-xs mt-0.5 font-medium tracking-wide animate-fade-in-left animate-delay-200"
              style={{ color: "rgba(200,155,80,0.75)" }}
            >
              Gestion de stock &amp; ventes
            </p>
          </div>
        </div>

        {/* Middle — feature list */}
        <div className="relative space-y-5">
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em] animate-fade-in-left"
            style={{ color: "rgba(200,140,60,0.55)", animationDelay: "250ms", opacity: 0, animationFillMode: "forwards" }}
          >
            Tout ce dont vous avez besoin
          </p>
          {PANEL_FEATURES.map(({ icon: Icon, label, sub }, i) => (
            <div
              key={label}
              className="flex items-start gap-3 animate-fade-in-left"
              style={{
                animationDelay: `${i * 90 + 350}ms`,
                opacity: 0,
                animationFillMode: "forwards",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background: "rgba(190,100,30,0.13)",
                  border: "1px solid rgba(200,130,40,0.18)",
                }}
              >
                <Icon className="w-4 h-4" style={{ color: "rgba(210,155,75,0.9)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight" style={{ color: "rgba(240,220,190,0.88)" }}>
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(180,155,110,0.6)" }}>
                  {sub}
                </p>
              </div>
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
            <span>Inscription sécurisée</span>
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
      <main className="flex flex-1 items-center justify-center bg-background p-6 pt-24 md:pt-6 md:border-l border-border overflow-y-auto">
        <div className="w-full max-w-sm space-y-6 py-4">

          {/* Heading */}
          <div className="animate-fade-in-up">
            <h1 className="text-2xl font-bold tracking-tight">Créer un compte</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Rejoignez votre espace de gestion
            </p>
          </div>

          {/* ── Form card ── */}
          <div className="bg-card rounded-xl border shadow-sm p-6 space-y-4 animate-form-entrance animate-delay-100">
            <form className="space-y-4" noValidate>

              {/* Nom complet */}
              <div>
                <Label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >
                  Nom complet
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="ex : Jean Mouloungui"
                    className="h-11 pl-9 rounded-lg border-border/60 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)] focus-visible:border-[hsl(var(--primary)/0.5)]"
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <Label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="ex : vendeur@naoservices.ga"
                    className="h-11 pl-9 rounded-lg border-border/60 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)] focus-visible:border-[hsl(var(--primary)/0.5)]"
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <Label
                  htmlFor="reg-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 caractères"
                    className="h-11 pl-9 pr-10 rounded-lg border-border/60 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)] focus-visible:border-[hsl(var(--primary)/0.5)]"
                    disabled={isSubmitting}
                    autoComplete="new-password"
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

              {/* Nom de l'entreprise */}
              <div>
                <Label
                  htmlFor="reg-company"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
                >
                  Nom de l'entreprise
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="reg-company"
                    type="text"
                    placeholder="ex : Boutique MPJ HIGH-TECH"
                    className="h-11 pl-9 rounded-lg border-border/60 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring)/0.35)] focus-visible:border-[hsl(var(--primary)/0.5)]"
                    disabled={isSubmitting}
                    autoComplete="organization"
                  />
                </div>
              </div>

              {/* Submit button — gradient animé identique LoginPage */}
              <Button
                type="submit"
                className="h-11 w-full font-semibold text-white border-0 shadow-md hover:brightness-110 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                style={
                  isSubmitting
                    ? { background: "hsl(var(--primary) / 0.5)" }
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
                    Création en cours…
                  </>
                ) : (
                  "Créer mon compte"
                )}
              </Button>
            </form>
          </div>

          {/* Lien connexion */}
          <p className="text-center text-sm text-muted-foreground animate-fade-in-up animate-delay-300">
            Déjà un compte ?{" "}
            <Link
              to="/auth/login"
              className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
            >
              Se connecter
            </Link>
          </p>

        </div>
      </main>
    </div>
  );
}
