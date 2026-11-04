import Link from "next/link";

function Arrow() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

/**
 * The one Back/Return control. "Return to <place>" always goes to a known route,
 * never history.back(), so it works when someone lands on a page directly.
 */
export function ReturnLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="tr-button tr-button--secondary self-start">
      <Arrow />
      Return to {label}
    </Link>
  );
}

/** "Back" to the previous step of a multi-step flow on the same page. Keeps what was entered. */
export function BackButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="tr-button tr-button--secondary self-start">
      <Arrow />
      Back
    </button>
  );
}
