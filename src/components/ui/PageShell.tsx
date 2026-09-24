import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Every page wraps in this instead of a hand-rolled `space-y-*` div — that
// inconsistency (space-y-8 vs space-y-6 across pages, audit finding #1) is
// resolved by having exactly one component own page-level spacing.
export function PageShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-screen-xl flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-6 lg:px-8 lg:py-6", className)}>
      {children}
    </div>
  );
}
