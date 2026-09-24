import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// Tailwind's scanner needs full literal class strings in source — it can't
// evaluate `grid-cols-${n}`, so every supported card count is spelled out.
// Table straight from docs/design-system.md §4.5 (2-6); 8 is this app's own
// addition (Reports' project-report stat grid) using the same "always even,
// no orphan row" principle the spec's own rows follow.
const GRID_BY_COUNT: Record<number, { grid: string; lastSpanMobile: boolean }> = {
  2: { grid: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-2", lastSpanMobile: false },
  3: { grid: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3", lastSpanMobile: true },
  4: { grid: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4", lastSpanMobile: false },
  5: { grid: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5", lastSpanMobile: true },
  6: { grid: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3", lastSpanMobile: false },
  8: { grid: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-4", lastSpanMobile: false },
};

export function StatGrid({ children, className }: { children: ReactNode; className?: string }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<{ className?: string }>[];
  const count = items.length;
  const config = GRID_BY_COUNT[count];

  if (!config) {
    // Fall back to a sensible generic layout rather than silently rendering
    // nothing for a card count this design system's table doesn't define.
    return <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>{children}</div>;
  }

  return (
    <div className={cn("grid gap-3", config.grid, className)}>
      {items.map((child, index) => {
        const isLast = index === items.length - 1;
        if (config.lastSpanMobile && isLast) {
          return cloneElement(child, { className: cn(child.props.className, "col-span-2 sm:col-span-1") });
        }
        return child;
      })}
    </div>
  );
}
