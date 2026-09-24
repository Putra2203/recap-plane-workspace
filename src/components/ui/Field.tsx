import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const inputId = useId();
  const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  const child = isValidElement(children) ? (children as ReactElement<Record<string, unknown>>) : null;
  const controlId = (child?.props.id as string | undefined) ?? inputId;
  const control = child
    ? cloneElement(child, {
        id: controlId,
        "aria-describedby": describedById,
        "aria-invalid": error ? true : undefined,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={controlId} className="text-xs font-medium text-fg-muted">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {control}
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${inputId}-hint`} className="text-xs text-fg-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
