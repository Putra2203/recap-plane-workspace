import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type StatTone = "default" | "danger" | "warning" | "success";

const TONE_TEXT: Record<StatTone, string> = {
  default: "text-fg",
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
};

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  badge,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-card border border-line bg-surface p-3 sm:p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-xs text-fg-subtle" title={label}>
          {label}
        </p>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      <p className={cn("mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl", TONE_TEXT[tone])}>{value}</p>
      {hint && <p className="mt-1 line-clamp-2 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
