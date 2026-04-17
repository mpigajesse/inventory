export type Genre = "M" | "F" | "NC" | null | undefined;

export function getRoleLabel(role: string, genre: Genre): string {
  if (role === "admin") {
    if (genre === "M") return "Administrateur";
    if (genre === "F") return "Administratrice";
    return "Administrateur·rice";
  }
  if (genre === "M") return "Vendeur";
  if (genre === "F") return "Vendeuse";
  return "Vendeur·se";
}
