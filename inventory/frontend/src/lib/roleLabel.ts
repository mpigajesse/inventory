export type Genre = "M" | "F" | "NC" | null | undefined;

const KNOWN_ROLES = new Set(["admin", "vendeur"]);

export function getRoleLabel(role: string, genre: Genre): string {
  // Guard : rôle inconnu ou vide → libellé générique sans exposer la valeur brute
  if (!role || !KNOWN_ROLES.has(role)) return "Utilisateur·rice";

  if (role === "admin") {
    if (genre === "M") return "Administrateur";
    if (genre === "F") return "Administratrice";
    return "Administrateur·rice";
  }
  // role === "vendeur"
  if (genre === "M") return "Vendeur";
  if (genre === "F") return "Vendeuse";
  return "Vendeur·se";
}
