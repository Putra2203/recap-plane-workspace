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
export type DialogSize = "md" | "lg";

const DESKTOP_WIDTH: Record<DialogSize, string> = {
  md: "sm:max-w-md", // 448px — short confirmations, simple detail
  lg: "sm:max-w-2xl", // 672px — content with a breakdown/table (e.g. member analytics)
};

export function Dialog({
  open,
  onOpenChange,
  title,
  size = "md",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  size?: DialogSize;
  children: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        {/* No tailwindcss-animate plugin here: enter uses the canopy-dialog-in
            keyframe (globals.css) since a Radix mount has no "before" frame
            for a transition to interpolate from; exit uses a plain CSS
            transition to data-[state=closed]:opacity-0, which Radix keeps
            the element mounted for until it finishes. */}
        <RadixDialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-fg/40 transition-opacity duration-200",
            "data-[state=open]:animate-[canopy-dialog-in_200ms_ease-out]",
            "data-[state=closed]:opacity-0",
          )}
        />
        <RadixDialog.Content
          className={cn(
            "fixed z-50 flex flex-col bg-surface outline-none transition-opacity duration-200",
            "data-[state=open]:animate-[canopy-dialog-in_200ms_ease-out]",
            "data-[state=closed]:opacity-0",
            // Mobile: bottom sheet — width and height stay identical
            // regardless of `size`, since a phone screen has no room to
            // grow into; only the desktop breakpoint below varies by size.
            "inset-x-0 bottom-0 max-h-[85vh] rounded-t-card border-t border-line",
            // Desktop: centered modal
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[80vh] sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card sm:border sm:border-line",
            DESKTOP_WIDTH[size],
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
            <RadixDialog.Title className="min-w-0 truncate font-display text-base font-semibold">{title}</RadixDialog.Title>
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
