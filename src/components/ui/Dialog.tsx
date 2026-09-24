"use client";

import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

// Not part of the original design-system spec (docs/design-system.md) —
// added because the user wants Member Recap's task detail to open as a
// modal on desktop and a bottom sheet on mobile, rather than an inline
// table-row expansion. Built on @radix-ui/react-dialog for the parts that
// are unsafe to hand-roll (focus trap, ESC to close, scroll lock, portal),
// styled entirely with this design system's tokens — none of Radix's
// default styling is used. One component, no JS breakpoint detection:
// mobile is a bottom sheet by default, `sm:` classes turn it into a
// centered modal.
export function Dialog({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        {/* No tailwindcss-animate plugin here, so this stays a plain fade via
            transition + Radix's data-state attribute rather than referencing
            animate-in/slide-in-from-* utilities that wouldn't exist. */}
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-fg/40 transition-opacity" />
        <RadixDialog.Content
          className={cn(
            "fixed z-50 flex flex-col bg-surface outline-none transition-transform",
            // Mobile: bottom sheet
            "inset-x-0 bottom-0 max-h-[85vh] rounded-t-card border-t border-line",
            // Desktop: centered modal
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:border sm:border-line",
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <RadixDialog.Title className="min-w-0 truncate text-base font-semibold">{title}</RadixDialog.Title>
            <RadixDialog.Close className="shrink-0 rounded-control p-1 text-fg-subtle hover:bg-surface-hover hover:text-fg" aria-label="Tutup">
              <X className="size-4" />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
