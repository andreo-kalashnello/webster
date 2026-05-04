import { Link } from "react-router-dom";

const userTemplates = [
  { id: "u1", name: "Open day poster", updatedAt: "Mar 18" },
  { id: "u2", name: "Club invite", updatedAt: "Mar 02" },
];

export function UserTemplatesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">My templates</p>
            <h1 className="mt-2 text-3xl font-semibold">Saved templates</h1>
          </div>
          <Link to="/" className="text-sm text-slate-300 hover:text-white">
            Back to landing
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {userTemplates.map(template => (
            <article
              key={template.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600"
            >
              <h2 className="text-lg font-semibold">{template.name}</h2>
              <p className="mt-2 text-sm text-slate-400">Updated {template.updatedAt}</p>
              <div className="mt-4 flex gap-3">
                <button className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900">
                  Open
                </button>
                <button className="rounded-full border border-slate-700/60 px-4 py-2 text-sm text-slate-200">
                  Duplicate
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}