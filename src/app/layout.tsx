import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "Traccoon PayAgent",
  description: "From conversation to financial clarity: reconstruct client agreements from chats, with evidence behind every amount.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="min-h-dvh antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
