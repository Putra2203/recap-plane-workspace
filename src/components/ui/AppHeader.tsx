"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
}

export function AppHeader({
  appName,
  navItems,
  actions,
}: {
  appName: string;
  navItems: NavItem[];
  actions?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex h-12 w-full max-w-screen-xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <span className="min-w-0 truncate font-display text-base font-semibold text-fg">{appName}</span>

        <nav className="hidden items-center gap-4 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative py-3.5 font-display text-sm font-medium text-fg-subtle transition-colors hover:text-fg",
                  active && "text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>

      {/* Mobile: nav becomes a horizontally-scrollable tab row on its own line */}
      <nav className="scrollbar-hide flex gap-4 overflow-x-auto whitespace-nowrap border-t border-line px-4 py-2 md:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("font-display text-sm font-medium text-fg-subtle", active && "text-primary")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
