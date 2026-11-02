import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary";

function classes(variant: Variant, extra?: string) {
  return ["tr-button", variant === "secondary" && "tr-button--secondary", extra].filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
};

/** Actions. Use ButtonLink for navigation. */
export function Button({ variant = "primary", loading, loadingLabel, children, className, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={classes(variant, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  children,
  className,
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={classes(variant, className)}>
      {children}
    </Link>
  );
}
