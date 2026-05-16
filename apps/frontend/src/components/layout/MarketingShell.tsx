import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { BrandLogo } from "./BrandLogo";

type MarketingShellProps = {
  children: ReactNode;
  minimalNav?: boolean;
};

export function MarketingShell({ children, minimalNav = false }: MarketingShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-hero-gradient text-violet-950">
      <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-violet-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-cyan-300/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandLogo />
        {!minimalNav ? (
          <nav className="flex items-center gap-3 text-sm font-semibold">
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-violet-800 transition hover:bg-white/60"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-linear-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110"
            >
              Get started
            </Link>
          </nav>
        ) : null}
      </header>

      <main className="relative z-10">{children}</main>
    </div>
  );
}
