import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-4 py-8 text-center", className)}>
      <div className="flex size-10 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
        {icon ?? <Inbox className="size-4" />}
      </div>
      <p className="text-balance text-base font-medium text-fg">{title}</p>
      {description && <p className="max-w-sm text-sm text-fg-subtle">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
