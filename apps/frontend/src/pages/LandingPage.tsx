import { Link } from "react-router-dom";
import {
  Layers,
  MousePointerClick,
  Palette,
  Share2,
  Sparkles,
  Zap,
} from "lucide-react";

import { MarketingShell } from "@/components/layout/MarketingShell";

const FEATURES = [
  {
    icon: Palette,
    title: "Colorful canvas editor",
    description:
      "Draw shapes, arrows, text, and images on an infinite board with a fast 2D engine built for smooth interaction.",
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: Layers,
    title: "Projects that stay in sync",
    description:
      "Every project autosaves to the cloud. Pick up where you left off on any device after you sign in.",
    accent: "from-cyan-500 to-blue-500",
  },
  {
    icon: Sparkles,
    title: "My templates",
    description:
      "Save any board as a personal template and spin up new projects with the same scene and canvas size in one click.",
    accent: "from-amber-400 to-orange-500",
  },
  {
    icon: Share2,
    title: "Export and share",
    description:
      "Download scene JSON, export PNG snapshots, version your work, and generate share links when you are ready.",
    accent: "from-rose-400 to-pink-500",
  },
  {
    icon: Zap,
    title: "Built for speed",
    description:
      "Pan, zoom, multi-select, and edit properties in real time — no page reloads while you design.",
    accent: "from-emerald-400 to-teal-500",
  },
] as const;

export function LandingPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-4 md:pt-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-violet-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-fuchsia-500" />
              Free online design studio
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-violet-950 sm:text-5xl lg:text-6xl">
              Create posters, maps, and slides with{" "}
              <span className="text-gradient">Webster</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-violet-800/85">
              Webster is a browser-based canvas for campus teams and creators. Sketch ideas, arrange visuals,
              and ship polished materials in minutes — one account unlocks the full editor.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-violet-600 via-fuchsia-500 to-cyan-500 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-violet-500/30 transition hover:brightness-110"
              >
                <MousePointerClick className="h-4 w-4" />
                Create free account
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center rounded-full border-2 border-violet-300/80 bg-white/80 px-7 py-3.5 text-sm font-bold text-violet-900 transition hover:border-violet-400 hover:bg-white"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="glass-card-light relative overflow-hidden rounded-3xl p-6">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-fuchsia-300/40 blur-2xl" aria-hidden />
            <div className="relative aspect-[4/3] rounded-2xl border border-violet-100 bg-linear-to-br from-violet-100 via-white to-cyan-50 p-4 shadow-inner">
              <div className="flex h-full flex-col gap-3">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="grid flex-1 grid-cols-2 gap-3">
                  <div className="rounded-xl bg-linear-to-br from-violet-400 to-fuchsia-400 opacity-90" />
                  <div className="rounded-xl border-2 border-dashed border-cyan-300/80 bg-cyan-50/80" />
                  <div className="col-span-2 rounded-xl bg-linear-to-r from-amber-200 to-orange-200" />
                </div>
              </div>
            </div>
            <p className="relative mt-4 text-center text-sm font-medium text-violet-700">
              Drag, resize, and style elements on a live canvas
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-violet-200/50 bg-white/40 py-16 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-violet-950">Everything you need to ship visuals</h2>
            <p className="mx-auto mt-3 max-w-2xl text-violet-800/80">
              Five pillars of the Webster workflow — from blank canvas to shared deliverable.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="glass-card-light group rounded-2xl p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-200/50"
                >
                  <span
                    className={`inline-flex rounded-xl bg-linear-to-br ${feature.accent} p-3 text-white shadow-lg`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-violet-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-violet-800/75">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="overflow-hidden rounded-3xl bg-linear-to-r from-violet-600 via-fuchsia-600 to-cyan-500 p-10 text-center text-white shadow-2xl shadow-violet-500/25 md:p-14">
          <h2 className="text-3xl font-bold md:text-4xl">Ready to open your first board?</h2>
          <p className="mx-auto mt-4 max-w-xl text-violet-100">
            Sign up in under a minute. Your projects, templates, and editor are waiting on the other side.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/register"
              className="rounded-full bg-white px-8 py-3 text-sm font-bold text-violet-900 shadow-lg transition hover:bg-violet-50"
            >
              Get started free
            </Link>
            <Link
              to="/login"
              className="rounded-full border-2 border-white/60 px-8 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-violet-200/40 py-8 text-center text-sm text-violet-700/80">
        Webster · Canvas studio for teams and campuses
      </footer>
    </MarketingShell>
  );
}
