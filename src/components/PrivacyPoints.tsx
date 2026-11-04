import Link from "next/link";

/** The processing disclosure shown before the first upload (onboarding and the new-investigation form). */
export function PrivacyPoints({ retentionDays }: { retentionDays: number }) {
  return (
    <>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>Only upload conversations you have permission to process.</li>
        <li>You can blur names and profile photos first. PayAgent still reads the messages, and won&apos;t guess who a blurred person is.</li>
        <li>Screenshots can contain sensitive financial or personal information.</li>
        <li>To read your evidence, PayAgent sends it to Meta&apos;s Model API, an external AI provider.</li>
        <li>
          This guest workspace and everything in it are deleted {retentionDays} days after you last use it, or as soon as you delete it in Settings &amp; Privacy. There is no account, so
          clearing your browser data also loses access to it.
        </li>
        <li>No real payments are made in this version.</li>
      </ul>
      <p>
        <Link href="/privacy" className="font-bold underline">Read the full privacy and data-handling explanation</Link>
      </p>
    </>
  );
}
