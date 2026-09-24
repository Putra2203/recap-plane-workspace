import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface KeyValueItem {
  key: string;
  label: string;
  value: ReactNode;
}

export function KeyValue({ items, className }: { items: KeyValueItem[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-3 gap-y-1.5", className)}>
      {items.map((item) => (
        <div key={item.key} className="contents">
          <dt className="text-xs text-fg-subtle">{item.label}</dt>
          <dd className="text-sm text-right tabular-nums break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
