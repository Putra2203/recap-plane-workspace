import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-card border border-line bg-surface", className)}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5 sm:px-4", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold truncate">{title}</h2>
        {description && <p className="text-xs text-fg-subtle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-3 sm:p-4", className)}>{children}</div>;
}
