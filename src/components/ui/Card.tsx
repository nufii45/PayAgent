import type { HTMLAttributes } from "react";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={["tr-surface p-5 sm:p-6", className].filter(Boolean).join(" ")} />;
}
