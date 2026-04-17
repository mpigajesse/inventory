import { cn } from "@/lib/utils";
import { getProductIcon } from "@/lib/productIcons";
import { useState } from "react";

type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

interface ProductIconProps {
  name: string;
  category?: string;
  size?: IconSize;
  className?: string;
  imageUrl?: string | null;
}

const sizeMap: Record<IconSize, { wrapper: string; icon: string }> = {
  xs: { wrapper: "w-5 h-5 rounded", icon: "w-2.5 h-2.5" },
  sm: { wrapper: "w-7 h-7 rounded-md", icon: "w-3.5 h-3.5" },
  md: { wrapper: "w-10 h-10 rounded-lg", icon: "w-5 h-5" },
  lg: { wrapper: "w-16 h-16 rounded-xl", icon: "w-8 h-8" },
  xl: { wrapper: "w-24 h-24 rounded-2xl", icon: "w-12 h-12" },
};

export function ProductIcon({
  name,
  category = "",
  size = "md",
  className,
  imageUrl,
}: ProductIconProps) {
  const [imgError, setImgError] = useState(false);
  const Icon = getProductIcon(name, category);
  const { wrapper, icon } = sizeMap[size];

  if (imageUrl && !imgError) {
    return (
      <div
        className={cn(
          "overflow-hidden shrink-0 bg-muted/50",
          wrapper,
          className
        )}
      >
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover rounded-[inherit]"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

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
