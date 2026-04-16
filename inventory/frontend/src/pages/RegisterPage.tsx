import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold">INVENTORY</h1>
          <p className="text-sm text-muted-foreground mt-1">Créer votre compte</p>
        </div>

        <div className="bg-card rounded-lg border p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nom complet</Label>
              <Input placeholder="ex: Jean Mouloungui" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" placeholder="ex: vendeur@naoservices.ga" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Mot de passe</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 caractères"
                />
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
            <div>
              <Label className="text-xs">Nom de l'entreprise</Label>
              <Input placeholder="ex: Boutique MPJ HIGH-TECH" className="mt-1.5" />
            </div>
            <Button className="w-full">Créer mon compte</Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Déjà un compte ?{" "}
          <Link to="/auth/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
