import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";

import { CREATE_PROJECT_MUTATION, PROJECTS_QUERY } from "../graphql/projects.graphql";

const DEFAULT_PAGINATION = { page: 1, limit: 12 };

function formatDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(PROJECTS_QUERY, {
    variables: { pagination: DEFAULT_PAGINATION },
  });
  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT_MUTATION, {
    refetchQueries: [{ query: PROJECTS_QUERY, variables: { pagination: DEFAULT_PAGINATION } }],
  });

  const projects = data?.projects?.items ?? [];

  const handleCreateProject = async () => {
    const title = `Untitled ${new Date().toLocaleDateString()}`;
    const result = await createProject({
      variables: {
        input: {
          title,
        },
      },
    });

    const projectId = result.data?.createProject?.id as string | undefined;
    navigate(projectId ? `/editor?projectId=${projectId}` : "/editor");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Projects</p>
            <h1 className="mt-2 text-3xl font-semibold">Your projects</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:opacity-60"
              onClick={handleCreateProject}
              type="button"
              disabled={creating}
            >
              {creating ? "Creating..." : "New project"}
            </button>
            <Link to="/" className="text-sm text-slate-300 hover:text-white">
              Back to home
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            Loading projects...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
            Failed to load projects: {error.message}
          </div>
        ) : null}

        {!loading && projects.length === 0 && !error ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            No projects yet. Create your first one.
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          {projects.map((project: { id: string; title: string; updatedAt?: string }) => (
            <article
              key={project.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600"
            >
              <h2 className="text-lg font-semibold">{project.title}</h2>
              <p className="mt-2 text-sm text-slate-400">Updated {formatDate(project.updatedAt)}</p>
              <div className="mt-4 flex gap-3">
                <Link
                  to={`/editor?projectId=${project.id}`}
                  className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  Open
                </Link>
                <button className="rounded-full border border-slate-700/60 px-4 py-2 text-sm text-slate-200">
                  Share
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}