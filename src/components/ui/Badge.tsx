import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "warning" | "danger" | "success" | "info" | "primary";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-fg-muted border-line",
  warning: "bg-warning-bg text-warning border-warning-line",
  danger: "bg-danger-bg text-danger border-danger-line",
  success: "bg-success-bg text-success border-success-line",
  info: "bg-info-bg text-info border-info-line",
  primary: "bg-primary-soft text-primary border-transparent",
};

export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

// Semantic badges — one DOM shape for one meaning everywhere it appears
// (resolves the audit's inconsistency #4: this exact message used to have 3
// different DOM shapes across Members/Reports/Project Detail).
export function EstimateMissingBadge({ count, className }: { count?: number; className?: string }) {
  return (
    <Badge tone="warning" icon={<AlertTriangle className="size-3.5" />} className={className}>
      {count != null ? `${count} task tanpa estimate` : "Estimate tidak terhitung"}
    </Badge>
  );
}

export function OverdueBadge({ count, className }: { count?: number; className?: string }) {
  return (
    <Badge tone="danger" className={className}>
      {count != null ? `Overdue ${count}` : "Overdue"}
    </Badge>
  );
}

export type StatusTone = "success" | "info" | "neutral" | "danger" | "warning";

export function StatusBadge({ label, tone, className }: { label: string; tone: StatusTone; className?: string }) {
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  );
}
