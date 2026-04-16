import { cn } from "@/lib/utils";
import { getProductIcon } from "@/lib/productIcons";

type IconSize = "sm" | "md" | "lg" | "xl";

interface ProductIconProps {
  name: string;
  category: string;
  size?: IconSize;
  className?: string;
}

const sizeMap: Record<IconSize, { wrapper: string; icon: string }> = {
  sm: { wrapper: "w-7 h-7 rounded-md", icon: "w-3.5 h-3.5" },
  md: { wrapper: "w-10 h-10 rounded-lg", icon: "w-5 h-5" },
  lg: { wrapper: "w-16 h-16 rounded-xl", icon: "w-8 h-8" },
  xl: { wrapper: "w-24 h-24 rounded-2xl", icon: "w-12 h-12" },
};

export function ProductIcon({
  name,
  category,
  size = "md",
  className,
}: ProductIconProps) {
  const Icon = getProductIcon(name, category);
  const { wrapper, icon } = sizeMap[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-primary/10 text-primary shrink-0",
        wrapper,
        className
      )}
    >
      <Icon className={icon} />
    </div>
  );
}
