import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface AccessDeniedProps {
  message?: string;
}

export function AccessDenied({ message = "Accès non autorisé" }: AccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <ShieldAlert className="w-10 h-10 text-destructive" />
      </div>
      <h2 className="text-2xl font-heading font-bold">Accès refusé</h2>
      <p className="text-muted-foreground max-w-sm">{message}</p>
      <Button variant="outline" onClick={() => navigate(-1)}>
        Retour
      </Button>
    </div>
  );
}
