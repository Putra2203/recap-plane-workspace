import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export type NoticeTone = "info" | "warning" | "danger" | "success";

const TONE_CLASSES: Record<NoticeTone, string> = {
  info: "border-info-line bg-info-bg text-info",
  warning: "border-warning-line bg-warning-bg text-warning",
  danger: "border-danger-line bg-danger-bg text-danger",
  success: "border-success-line bg-success-bg text-success",
};

const TONE_ICONS: Record<NoticeTone, ReactNode> = {
  info: <Info className="size-4" />,
  warning: <AlertTriangle className="size-4" />,
  danger: <OctagonAlert className="size-4" />,
  success: <CheckCircle2 className="size-4" />,
};

export function Notice({
  tone,
  title,
  action,
  className,
  children,
}: {
  tone: NoticeTone;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex gap-3 rounded-card border p-3 sm:p-4", TONE_CLASSES[tone], className)}>
      <div className="shrink-0">{TONE_ICONS[tone]}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 text-sm">
          <p className="font-medium">{title}</p>
          {children && <div className="mt-1">{children}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
