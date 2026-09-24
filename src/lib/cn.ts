import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Default tailwind-merge dedupes bg-*/text-*/border-* correctly for our
// custom color tokens (bg-canvas vs bg-surface, etc.) since it matches those
// by prefix pattern. It does NOT know our custom radius scale by default —
// verified: cn("rounded-control", "rounded-card") kept BOTH classes instead
// of the later one winning, until this classGroups extension was added.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [{ rounded: ["control", "card"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
