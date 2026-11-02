import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "Traccoon PayAgent",
  description: "Turn chats and voice notes into approved invoices, payment requests and reconciled records.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="min-h-dvh antialiased">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-wide items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <Link href="/" className="text-lg font-extrabold">
              Traccoon PayAgent
            </Link>
            <span className="rounded-full border border-warning bg-warning-bg px-2.5 py-0.5 text-sm font-bold text-warning">
              Test data only
            </span>
          </div>
        </header>
        <main className="mx-auto flex max-w-wide flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      </body>
    </html>
  );
}
