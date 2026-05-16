import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { BrandLogo } from "./BrandLogo";

type AppShellProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
};

const NAV = [
  { to: "/", label: "Home" },
  { to: "/projects", label: "Projects" },
  { to: "/templates", label: "My templates" },
  { to: "/editor", label: "Editor" },
] as const;

export function AppShell({ children, title, subtitle, actions }: AppShellProps) {
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-app-gradient text-white">
      <div className="pointer-events-none absolute -left-20 top-0 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />

      <header className="relative z-20 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <BrandLogo variant="light" />
          <nav className="flex flex-wrap items-center gap-1">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    active
                      ? "rounded-full bg-white/15 px-3.5 py-2 text-sm font-semibold text-white"
                      : "rounded-full px-3.5 py-2 text-sm font-medium text-violet-100/80 transition hover:bg-white/10 hover:text-white"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              to="/profile"
              className="ml-1 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-900/30"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        {title ? (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              {subtitle ? (
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300/90">{subtitle}</p>
              ) : null}
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
