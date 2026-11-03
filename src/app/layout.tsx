import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Link from "next/link";
import { authEnabled } from "@/lib/session";
import { logout } from "./login/actions";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "Traccoon PayAgent",
  description: "From conversation to financial clarity: reconstruct client agreements from chats, with evidence behind every amount.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const signedInMode = authEnabled();
  return (
    <html lang="en" className={nunito.variable}>
      <body className="min-h-dvh antialiased">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-wide items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="text-lg font-extrabold">
              Traccoon PayAgent
            </Link>
            {signedInMode ? (
              <form action={logout}>
                <button type="submit" className="rounded-control px-3 py-2 font-bold text-muted hover:bg-page">
                  Log out
                </button>
              </form>
            ) : (
              <span className="rounded-full border border-warning bg-warning-bg px-2.5 py-0.5 text-sm font-bold text-warning">
                Test data only
              </span>
            )}
          </div>
          <nav aria-label="Main" className="mx-auto flex max-w-wide gap-1 overflow-x-auto px-2 pb-2 sm:px-4">
            {[
              ["/", "Workspace"],
              ["/investigations", "Investigations"],
              ["/invoices", "Invoices"],
              ["/activity", "Activity"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-control px-3 py-2 font-bold whitespace-nowrap hover:bg-page">
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto flex max-w-wide flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
        <footer className="mx-auto max-w-wide px-4 pb-10 text-sm text-muted sm:px-6">
          Screenshots, pasted text and voice notes you add are sent to Meta&apos;s Model API to be read, and stored in this
          app&apos;s database until you delete the investigation. Analysis can be wrong: check every amount against the
          source before you send anything.
        </footer>
      </body>
    </html>
  );
}
