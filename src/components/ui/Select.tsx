import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_BASE } from "./Input";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(CONTROL_BASE, props["aria-invalid"] && "border-danger", className)} {...props}>
      {children}
    </select>
  );
}
