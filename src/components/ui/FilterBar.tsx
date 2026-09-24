import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

export function FilterBar({
  onReset,
  className,
  children,
}: {
  onReset?: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-card border border-line bg-surface p-3 sm:flex-row sm:flex-wrap sm:items-end sm:p-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end [&>*]:sm:w-48">{children}</div>
      {onReset && (
        <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="size-4" />} onClick={onReset}>
          Reset
        </Button>
      )}
    </div>
  );
}
