import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Eye, EyeOff, Shield, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_ADMIN, MOCK_VENDEUR } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { setCurrentUser } = useAuth();
  const navigate = useNavigate();

  function loginAs(role: "admin" | "vendeur") {
    if (role === "admin") {
      setCurrentUser(MOCK_ADMIN);
      navigate("/dashboard");
    } else {
      setCurrentUser(MOCK_VENDEUR);
      navigate("/vendeur/dashboard");
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
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="admin@naoservices.ga" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Mot de passe</Label>
              <div className="relative mt-1.5">
                <Input type={showPassword ? "text" : "password"} placeholder="Votre mot de passe" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button className="w-full" onClick={() => loginAs("admin")}>
              Se connecter
            </Button>
          </div>
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
              onClick={() => loginAs("admin")}
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
              onClick={() => loginAs("vendeur")}
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
