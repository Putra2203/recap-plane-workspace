import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const TEXTAREA_BASE =
  "min-h-20 w-full min-w-0 rounded-control border border-line-strong bg-surface px-2.5 py-2 text-[16px] sm:text-sm text-fg " +
  "placeholder:text-fg-faint focus-visible:border-primary disabled:bg-surface-muted disabled:text-fg-disabled";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(TEXTAREA_BASE, props["aria-invalid"] && "border-danger", className)} {...props} />;
}
