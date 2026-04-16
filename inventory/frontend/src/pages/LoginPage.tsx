import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Eye, EyeOff, Shield, ShoppingBag, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const DEMO_ACCOUNTS = [
  {
    label: 'Admin',
    name: 'Admin Principal',
    username: 'admin',
    password: 'Admin1234!',
    icon: Shield,
    role: 'admin' as const,
    badgeClass: 'bg-primary/10 text-primary',
    cardClass: 'hover:border-primary/40 hover:bg-primary/5',
    iconClass: 'bg-primary/10 text-primary group-hover:bg-primary/20',
  },
  {
    label: 'Vendeur',
    name: 'Marie Koumba',
    username: 'vendeur1',
    password: 'Vendeur1234!',
    icon: ShoppingBag,
    role: 'vendeur' as const,
    badgeClass: 'bg-secondary text-secondary-foreground',
    cardClass: 'hover:border-secondary/60 hover:bg-secondary/20',
    iconClass: 'bg-secondary/50 text-secondary-foreground group-hover:bg-secondary',
  },
  {
    label: 'Vendeur',
    name: 'Paul Moussavou',
    username: 'vendeur2',
    password: 'Vendeur1234!',
    icon: ShoppingBag,
    role: 'vendeur' as const,
    badgeClass: 'bg-secondary text-secondary-foreground',
    cardClass: 'hover:border-secondary/60 hover:bg-secondary/20',
    iconClass: 'bg-secondary/50 text-secondary-foreground group-hover:bg-secondary',
  },
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch {
      setError('Identifiants incorrects. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loginAs(u: string, p: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(u, p);
      navigate('/dashboard');
    } catch {
      setError('Identifiants incorrects. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold">INVENTORY</h1>
          <p className="text-sm text-muted-foreground mt-1">Connectez-vous à votre espace</p>
        </div>

        <div className="bg-card rounded-lg border p-4 sm:p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label className="text-xs" htmlFor="username">Identifiant</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                className="mt-1.5"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isSubmitting}
                autoComplete="username"
              />
            </div>
            <div>
              <Label className="text-xs" htmlFor="password">Mot de passe</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>
        </div>

        {/* Comptes de démonstration */}
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">comptes de démonstration</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.username}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => loginAs(account.username, account.password)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border bg-card transition-all text-left group disabled:opacity-50 ${account.cardClass}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${account.iconClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{account.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{account.username} / {account.password}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${account.badgeClass}`}>
                    {account.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
