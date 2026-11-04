import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import { aiProcessor } from "@/lib/privacy";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "Traccoon PayAgent",
  description: "From conversation to financial clarity: reconstruct client agreements from chats, with evidence behind every amount.",
};

// viewport-fit=cover lets the pinned step actions sit above the iPhone home indicator via env(safe-area-inset-bottom).
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="min-h-dvh antialiased">
        <AppShell processor={aiProcessor().short}>{children}</AppShell>
      </body>
    </html>
  );
}
