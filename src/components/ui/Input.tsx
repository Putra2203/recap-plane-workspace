import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// h-11 mobile is the 44px touch-target recommendation (mobile-principles);
// sm:h-9 on desktop where a pointer needs less room.
export const CONTROL_BASE =
  "h-11 sm:h-9 w-full min-w-0 rounded-control border border-line-strong bg-surface px-3 text-[16px] sm:text-sm text-fg " +
  "transition-colors duration-150 placeholder:text-fg-faint focus-visible:border-primary disabled:bg-surface-muted disabled:text-fg-disabled";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_BASE, props["aria-invalid"] && "border-danger", className)} {...props} />;
}
