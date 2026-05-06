import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";

import {
  CREATE_PROJECT_FROM_TEMPLATE_MUTATION,
  USER_TEMPLATES_QUERY,
} from "../graphql/templates.graphql";

function formatDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function UserTemplatesPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(USER_TEMPLATES_QUERY);
  const [createFromTemplate, { loading: creating }] = useMutation(
    CREATE_PROJECT_FROM_TEMPLATE_MUTATION,
  );

  const templates = data?.userTemplates ?? [];

  const handleUseTemplate = async (templateId: string, title?: string) => {
    const result = await createFromTemplate({
      variables: { templateId, title },
    });

    const projectId = result.data?.createProjectFromTemplate?.id as string | undefined;
    navigate(projectId ? `/editor?projectId=${projectId}` : "/editor");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">My templates</p>
            <h1 className="mt-2 text-3xl font-semibold">Saved templates</h1>
          </div>
          <Link to="/" className="text-sm text-slate-300 hover:text-white">
            Back to home
          </Link>
        </header>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            Loading templates...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
            Failed to load templates: {error.message}
          </div>
        ) : null}

        {!loading && templates.length === 0 && !error ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            You have no saved templates yet.
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          {templates.map((template: { id: string; title: string; updatedAt?: string }) => (
            <article
              key={template.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600"
            >
              <h2 className="text-lg font-semibold">{template.title}</h2>
              <p className="mt-2 text-sm text-slate-400">Updated {formatDate(template.updatedAt)}</p>
              <div className="mt-4 flex gap-3">
                <button
                  className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
                  disabled={creating}
                  onClick={() => handleUseTemplate(template.id, template.title)}
                  type="button"
                >
                  {creating ? "Preparing..." : "Use"}
                </button>
                <Link
                  to="/editor"
                  className="rounded-full border border-slate-700/60 px-4 py-2 text-sm text-slate-200"
                >
                  Open in editor
                </Link>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}