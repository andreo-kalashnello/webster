import { Link } from "react-router-dom";

const templates = [
  { id: "t1", name: "Event flyer", category: "Marketing" },
  { id: "t2", name: "Poster grid", category: "Campus" },
  { id: "t3", name: "Social set", category: "Social" },
];

export function TemplatesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Templates</p>
            <h1 className="mt-2 text-3xl font-semibold">Starter templates</h1>
          </div>
          <Link to="/" className="text-sm text-slate-300 hover:text-white">
            Back to landing
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {templates.map(template => (
            <article
              key={template.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{template.category}</p>
              <h2 className="mt-3 text-lg font-semibold">{template.name}</h2>
              <button className="mt-4 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900">
                Use template
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}