import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 shrink-0 rounded-control border border-line-strong accent-primary focus-visible:border-primary disabled:bg-surface-muted",
        className,
      )}
      {...props}
    />
  );
}
