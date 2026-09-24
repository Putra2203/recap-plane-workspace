"use client";

import { cn } from "@/lib/cn";

// Built for design-system completeness (spec §4.10) — no page currently
// uses in-page tabs (Project Detail stacks Section blocks instead), so this
// has no current consumer. Uses a filled pill for the active tab (bg-primary-soft)
// rather than AppHeader's underline indicator, so top-level nav and in-page
// tabs stay visually distinct from each other.
export function NavTabs({
  items,
  activeKey,
  onChange,
}: {
  items: { key: string; label: string }[];
  activeKey: string;
  onChange: (key: string) => void;
}) {
  return (
    <div role="tablist" className="scrollbar-hide flex gap-1 overflow-x-auto whitespace-nowrap">
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "rounded-control px-3 py-1.5 text-sm font-medium text-fg-subtle hover:text-fg",
              active && "bg-primary-soft text-primary",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
