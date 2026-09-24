import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "link" | "danger";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-medium " +
  "transition-colors disabled:pointer-events-none disabled:bg-surface-muted disabled:text-fg-disabled disabled:border-line";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-surface-hover",
  ghost: "text-fg-muted hover:bg-surface-hover hover:text-fg",
  link: "h-auto px-0 text-primary underline-offset-4 hover:underline disabled:bg-transparent",
  danger: "bg-danger text-primary-fg hover:bg-danger-hover",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs sm:h-7",
  md: "h-9 px-3 text-sm sm:h-8",
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
