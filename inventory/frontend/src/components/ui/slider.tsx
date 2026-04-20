import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      // py-3 on the Root expands the vertical touch zone to ~44px total
      // (track h-2 = 8px + py-3*2 = 24px padding = 32px; combined with the
      // thumb negative-margin hit area this comfortably exceeds 44px).
      "relative flex w-full touch-none select-none items-center py-3",
      className,
    )}
    {...props}
  >
    {/* h-2 → h-[6px]: slightly thinner track stays readable on mobile retina screens.
        Keeping h-2 (8px) is also fine; not changed here as 8px is already reasonable. */}
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    {/*
      The visible thumb is h-5 w-5 (20px). On touch screens a 20px target is too small.
      We expand the hit area using a pseudo-element technique via the before: utility:
        before:absolute before:inset-0 before:m-[-12px]
      This extends the clickable area by 12px on each side → 20+24 = 44px total.
      The before: pseudo needs the thumb to be position:relative (Radix sets this).
    */}
    <SliderPrimitive.Thumb
      className="
        relative block h-5 w-5 rounded-full border-2 border-primary bg-background
        ring-offset-background transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        before:absolute before:inset-0 before:-m-[12px] before:rounded-full before:content-[\"\"]
      "
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
