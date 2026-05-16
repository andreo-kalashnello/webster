import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { FolderOpen, LayoutTemplate, PenLine, Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { AppPageSpinner } from "@/components/ui/PageSpinner";
import { PROJECTS_QUERY } from "@/graphql/projects.graphql";
import { useAuthStore } from "@/shared/stores/auth.store";

function formatRelativeDate(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, loading, error } = useQuery(PROJECTS_QUERY, {
    variables: { pagination: { page: 1, limit: 6 } },
  });

  const projects = (data as { projects?: { items?: Array<{ id: string; title: string; updatedAt?: string }> } } | undefined)
    ?.projects?.items ?? [];

  return (
    <AppShell
      title={`Welcome back, ${user?.firstName ?? "creator"}`}
      subtitle="Dashboard"
      actions={
        <>
          <Link
            to="/projects?new=1"
            className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg"
          >
            <Plus className="h-4 w-4" />
            New project
          </Link>
          <Link
            to="/editor"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15"
          >
            <PenLine className="h-4 w-4" />
            Open editor
          </Link>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Link
          to="/projects"
          className="glass-card group rounded-2xl p-6 transition hover:bg-white/10"
        >
          <span className="inline-flex rounded-xl bg-linear-to-br from-violet-400 to-fuchsia-500 p-3 text-white">
            <FolderOpen className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold">Projects</h2>
          <p className="mt-2 text-sm text-violet-100/75">Browse, create, and open your saved boards.</p>
        </Link>
        <Link
          to="/templates"
          className="glass-card group rounded-2xl p-6 transition hover:bg-white/10"
        >
          <span className="inline-flex rounded-xl bg-linear-to-br from-cyan-400 to-fuchsia-500 p-3 text-white">
            <LayoutTemplate className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-lg font-bold">My templates</h2>
          <p className="mt-2 text-sm text-violet-100/75">
            Save and reuse canvas layouts — create projects from your templates.
          </p>
        </Link>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-white">Recent projects</h2>
          <Link to="/projects" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            View all
          </Link>
        </div>

        {loading ? <AppPageSpinner label="Loading projects…" /> : null}

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            Could not load projects: {error.message}
          </p>
        ) : null}

        {!loading && !error && projects.length === 0 ? (
          <p className="mt-4 rounded-2xl glass-card px-6 py-8 text-center text-sm text-violet-100/80">
            No projects yet.{" "}
            <Link to="/projects?new=1" className="font-semibold text-cyan-300 hover:underline">
              Create your first one
            </Link>
            .
          </p>
        ) : null}

        {!loading && projects.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="glass-card rounded-2xl p-5 transition hover:bg-white/12"
              >
                <h3 className="font-semibold text-white">{project.title}</h3>
                <p className="mt-1 text-xs text-violet-200/70">Updated {formatRelativeDate(project.updatedAt)}</p>
                <Link
                  to={`/editor?projectId=${project.id}`}
                  className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
                >
                  Open in editor
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
