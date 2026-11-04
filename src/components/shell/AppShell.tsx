"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/investigations", label: "Investigations" },
  { href: "/invoices", label: "Invoices" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings & Privacy" },
] as const;

const isCurrent = (path: string, href: string) =>
  href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);

function NavLinks({ path, className, onNavigate }: { path: string; className: string; onNavigate: (href: string) => void }) {
  return (
    <ul className={className}>
      {NAV.map((n) => {
        const current = isCurrent(path, n.href);
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              onNavigate={() => onNavigate(n.href)}
              aria-current={current ? "page" : undefined}
              className={`block rounded-control px-3 py-2 font-bold whitespace-nowrap ${current ? "bg-page text-ink shadow-[inset_3px_0_0_var(--tr-color-text)]" : "text-muted hover:bg-page hover:text-ink"}`}
            >
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Disclosure({ processor }: { processor: string }) {
  return (
    <p className="text-sm text-muted">
      Evidence you add is sent to {processor} to be read, and kept in
      this guest workspace until you delete it or it expires.{" "}
      <Link href="/privacy" className="font-bold underline">
        How your data is handled
      </Link>
    </p>
  );
}

export function AppShell({ children, processor }: { children: ReactNode; processor: string }) {
  const realPath = usePathname();
  // The clicked page is marked current straight away. It only applies while the URL is the one it was clicked from.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null);
  if (clicked && clicked.from !== realPath) setClicked(null); // once the URL moves, it decides, including on Back
  const path = clicked?.from === realPath ? clicked.href : realPath;
  const onNavigate = (href: string) => setClicked({ href, from: realPath });
  const mobileNav = useRef<HTMLElement>(null);
  // The phone nav scrolls sideways, so bring the current page into view. Horizontal only, so an anchor link keeps its position.
  useEffect(() => {
    const nav = mobileNav.current;
    const current = nav?.querySelector('[aria-current="page"]');
    if (!nav || !current) return;
    const a = current.getBoundingClientRect();
    const b = nav.getBoundingClientRect();
    nav.scrollLeft += a.left + a.width / 2 - (b.left + b.width / 2);
  }, [path]);
  if (realPath.startsWith("/welcome")) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-wide flex-col gap-6 px-4 pt-6 sm:px-6 sm:py-10 lg:gap-10 lg:px-10">
        {children}
      </main>
    );
  }
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="hidden border-r border-line bg-surface lg:block">
        <aside className="sticky top-0 flex h-dvh flex-col gap-6 p-4">
          <Link href="/" className="px-3 pt-2 text-lg font-extrabold">
            Traccoon PayAgent
          </Link>
          <Link href="/investigations/new" onNavigate={() => onNavigate("/investigations/new")} className="tr-button">
            New investigation
          </Link>
          <nav aria-label="Main">
            <NavLinks path={path} onNavigate={onNavigate} className="flex flex-col gap-1" />
          </nav>
          <div className="mt-auto px-3">
            <Disclosure processor={processor} />
          </div>
        </aside>
      </div>

      <header className="border-b border-line bg-surface lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-base font-extrabold whitespace-nowrap sm:text-lg">
            Traccoon PayAgent
          </Link>
          <Link href="/investigations/new" onNavigate={() => onNavigate("/investigations/new")} className="tr-button text-sm">
            New investigation
          </Link>
        </div>
        <nav ref={mobileNav} aria-label="Main" className="overflow-x-auto px-2 pb-2">
          <NavLinks path={path} onNavigate={onNavigate} className="flex gap-1" />
        </nav>
      </header>

      <div className="flex min-w-0 flex-col">
        <main className="mx-auto flex w-full max-w-wide flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-wide px-4 pb-10 sm:px-6 lg:hidden">
          <Disclosure processor={processor} />
        </footer>
      </div>
    </div>
  );
}
