import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Section({
  title,
  actions,
  className,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="min-w-0 truncate font-display text-lg font-semibold">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
