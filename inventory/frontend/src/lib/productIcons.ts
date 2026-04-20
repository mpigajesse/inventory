import {
  Package,
  Milk,
  Droplets,
  Apple,
  Coffee,
  Wheat,
  Cookie,
  Sparkles,
  UtensilsCrossed,
  Leaf,
  Box,
  Wind,
  type LucideIcon,
} from "lucide-react";

// ─── Category → icon ──────────────────────────────────────────────────────────

export const categoryIcons: Record<string, LucideIcon> = {
  Alimentaire: UtensilsCrossed,
  Boissons: Droplets,
  Hygiène: Sparkles,
  Entretien: Wind,
  Autre: Package,
};

// ─── Product keyword → icon ───────────────────────────────────────────────────

const productIconMap: Record<string, LucideIcon> = {
  lait: Milk,
  nido: Milk,
  huile: Droplets,
  riz: Wheat,
  coca: Coffee,
  cola: Coffee,
  eau: Droplets,
  tangui: Droplets,
  savon: Sparkles,
  "pâtes": UtensilsCrossed,
  pates: UtensilsCrossed,
  panzani: UtensilsCrossed,
  sucre: Cookie,
  biscuits: Cookie,
  belvita: Cookie,
  détergent: Wind,
  detergent: Wind,
  omo: Wind,
  mayonnaise: UtensilsCrossed,
  tomate: Apple,
  concentrée: Apple,
  farine: Wheat,
  café: Coffee,
  cafe: Coffee,
  thé: Leaf,
  the: Leaf,
  légumes: Apple,
  legumes: Apple,
  fruit: Apple,
};

// ─── Selector ─────────────────────────────────────────────────────────────────

export function getProductIcon(name: string, category: string): LucideIcon {
  if (!name) return categoryIcons[category] ?? Box;
  const nameLower = name.toLowerCase();
  for (const [keyword, icon] of Object.entries(productIconMap)) {
    if (nameLower.includes(keyword)) return icon;
  }
  return categoryIcons[category] ?? Box;
}
