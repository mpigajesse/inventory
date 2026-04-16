import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Eye, EyeOff, Shield, ShoppingBag, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/contexts/AuthContext";

// Local demo constants — not exported from AuthContext anymore
const MOCK_ADMIN: User = {
  id: '1',
  name: 'Admin Principal',
  email: 'admin@naoservices.ga',
  role: 'admin',
};

const MOCK_VENDEUR: User = {
  id: '2',
  name: 'Marie Vendeur',
  email: 'marie@naoservices.ga',
  role: 'vendeur',
};

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, setCurrentUser } = useAuth();
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

  function loginAs(role: 'admin' | 'vendeur') {
    if (role === 'admin') {
      setCurrentUser(MOCK_ADMIN);
      navigate('/dashboard');
    } else {
      setCurrentUser(MOCK_VENDEUR);
      navigate('/vendeur/dashboard');
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

        {/* Connexion rapide — comptes de démonstration */}
        <div className="mt-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">ou connexion rapide</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => loginAs('admin')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{MOCK_ADMIN.name}</p>
                <p className="text-xs text-muted-foreground truncate">{MOCK_ADMIN.email}</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                Admin
              </span>
            </button>

            <button
              onClick={() => loginAs('vendeur')}
              className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-secondary/60 hover:bg-secondary/20 transition-all text-left group"
            >
              <div className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center shrink-0 group-hover:bg-secondary transition-colors">
                <ShoppingBag className="w-4 h-4 text-secondary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight">{MOCK_VENDEUR.name}</p>
                <p className="text-xs text-muted-foreground truncate">{MOCK_VENDEUR.email}</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase tracking-wide">
                Vendeur
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
