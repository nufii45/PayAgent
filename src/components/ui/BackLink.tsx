import Link from "next/link";

/**
 * The one Back/Return control. "Return to <place>" always goes to a known route,
 * never history.back(), so it works when someone lands on a page directly.
 */
export function ReturnLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="tr-button tr-button--secondary self-start">
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Return to {label}
    </Link>
  );
}
