import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "link" | "danger";
export type ButtonSize = "sm" | "md";

// The press effect (compressing offset shadow + translateY on :active) is
// Canopy's signature detail — see MASTER.md. Reserved for primary/danger
// only: the two "committing" actions. Every other variant stays flat, or
// the shadow stops meaning "this does something real" and just becomes
// decoration on every button.
const PRESS_EASE = "ease-[cubic-bezier(0.34,1.56,0.64,1)]";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-display font-semibold " +
  `transition-[transform,box-shadow,background-color,color] duration-200 ${PRESS_EASE} ` +
  "disabled:pointer-events-none disabled:bg-surface-muted disabled:text-fg-disabled disabled:border-line disabled:shadow-none disabled:translate-y-0";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-fg shadow-[0_4px_0_var(--color-primary-hover)] " +
    "hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-primary-hover)]",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-surface-hover",
  ghost: "text-fg-muted hover:bg-surface-hover hover:text-fg",
  link: "h-auto px-0 text-primary underline-offset-4 hover:underline disabled:bg-transparent disabled:shadow-none",
  danger:
    "bg-danger text-primary-fg shadow-[0_4px_0_var(--color-danger-hover)] " +
    "hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_var(--color-danger-hover)]",
};

// Mobile floor bumped toward the 44px touch-target recommendation
// (mobile-principles: 44px recommended / 24px WCAG AA floor) — this app is
// used from phones. Desktop stays compact since a pointer needs less room.
const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-2.5 text-xs sm:h-7",
  md: "h-11 px-4 text-sm sm:h-9",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  disabled?: boolean;
  "aria-label"?: string;
  // Forces a plain <a> instead of next/link. Required for any href that
  // isn't an app page — e.g. a Route Handler that responds with a file
  // (Content-Disposition: attachment). next/link intercepts clicks and
  // soft-navigates via the App Router's RSC transport, which breaks for a
  // raw PDF/text response — it's not a page, so there's nothing for the
  // router to render. A hard native navigation is what actually triggers
  // the browser's download behavior.
  download?: boolean;
};

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "secondary", size = "md", loading, leftIcon, rightIcon, fullWidth, className, children, ...rest } = props;

  const classes = cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
  const icon = loading ? <Loader2 className="size-4 animate-spin" /> : leftIcon;

  if ("href" in props && props.href) {
    const { href, disabled, download, ...linkRest } = rest as ButtonAsLink;
    if (disabled) {
      return (
        <span className={classes} aria-disabled="true">
          {icon}
          {children}
          {rightIcon}
        </span>
      );
    }
    if (download) {
      return (
        <a href={href} className={classes} {...linkRest}>
          {icon}
          {children}
          {rightIcon}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...linkRest}>
        {icon}
        {children}
        {rightIcon}
      </Link>
    );
  }

  const buttonRest = rest as Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;
  return (
    <button className={classes} disabled={loading || buttonRest.disabled} {...buttonRest}>
      {icon}
      {children}
      {rightIcon}
    </button>
  );
}
