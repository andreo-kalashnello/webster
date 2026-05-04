import { Link } from "react-router-dom";

const projects = [
  { id: "1", name: "Campus poster", updatedAt: "2 hours ago" },
  { id: "2", name: "Orientation map", updatedAt: "Yesterday" },
  { id: "3", name: "Student event banner", updatedAt: "Last week" },
];

export function ProjectsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Projects</p>
            <h1 className="mt-2 text-3xl font-semibold">Your projects</h1>
          </div>
          <Link to="/" className="text-sm text-slate-300 hover:text-white">
            Back to landing
          </Link>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {projects.map(project => (
            <article
              key={project.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600"
            >
              <h2 className="text-lg font-semibold">{project.name}</h2>
              <p className="mt-2 text-sm text-slate-400">Updated {project.updatedAt}</p>
              <div className="mt-4 flex gap-3">
                <Link
                  to="/editor"
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