import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { AppPageSpinner } from "@/components/ui/PageSpinner";
import {
  CREATE_PROJECT_MUTATION,
  DELETE_PROJECT_MUTATION,
  PROJECTS_QUERY,
} from "../graphql/projects.graphql";
import { createEmptySerializableSceneState } from "@/shared/lib/canvas-engine";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BlockingOverlay } from "@/components/ui/BlockingOverlay";
import { useToastStore } from "@/shared/stores/toast.store";

const DEFAULT_PAGINATION = { page: 1, limit: 12 };
const EMPTY_SCENE = createEmptySerializableSceneState();

function formatDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pushToast = useToastStore((state) => state.pushToast);

  const { data, loading, error } = useQuery(PROJECTS_QUERY, {
    variables: { pagination: DEFAULT_PAGINATION },
  });
  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT_MUTATION, {
    refetchQueries: [{ query: PROJECTS_QUERY, variables: { pagination: DEFAULT_PAGINATION } }],
    onError: (err) => {
      pushToast({
        title: "Project creation failed",
        message: err.message,
        tone: "error",
      });
    },
  });

  const [deleteProject, { loading: deleting }] = useMutation(DELETE_PROJECT_MUTATION, {
    update: (cache, { data: result }, options) => {
      if (!result?.deleteProject) {
        return;
      }

      const deletedId = options.variables?.id as string | undefined;
      if (!deletedId) {
        return;
      }

      cache.updateQuery(
        { query: PROJECTS_QUERY, variables: { pagination: DEFAULT_PAGINATION } },
        (prev) => {
          if (!prev?.projects) {
            return prev;
          }

          const nextItems = prev.projects.items.filter(
            (project: { id: string }) => project.id !== deletedId,
          );

          return {
            ...prev,
            projects: {
              ...prev.projects,
              items: nextItems,
              total: Math.max(0, (prev.projects.total ?? nextItems.length) - 1),
            },
          };
        },
      );
    },
    onError: (err) => {
      pushToast({
        title: "Delete failed",
        message: err.message,
        tone: "error",
      });
    },
  });

  const projects =
    (data as { projects?: { items?: Array<{ id: string; title: string; updatedAt?: string }> } } | undefined)
      ?.projects?.items ?? [];

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openCreateModal = useCallback(() => {
    setTitle(`Untitled ${new Date().toLocaleDateString()}`);
    setWidth(800);
    setHeight(600);
    setFormError(null);
    setCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setFormError(null);
  }, []);

  const handleSubmitCreate = async () => {
    const trimmed = title.trim();
    if (trimmed.length < 1) {
      setFormError("Title is required.");
      return;
    }
    if (!Number.isFinite(width) || width < 1 || width > 10000) {
      setFormError("Width must be between 1 and 10000.");
      return;
    }
    if (!Number.isFinite(height) || height < 1 || height > 10000) {
      setFormError("Height must be between 1 and 10000.");
      return;
    }

    setFormError(null);
    try {
      const result = await createProject({
        variables: {
          input: {
            title: trimmed,
            width: Math.floor(width),
            height: Math.floor(height),
            content: EMPTY_SCENE,
          },
        },
      });

      const projectId = result.data?.createProject?.id as string | undefined;
      if (projectId) {
        closeCreateModal();
        pushToast({ title: "Project created", tone: "success" });
        navigate(`/editor?projectId=${projectId}`);
      } else {
        setFormError("Project was not created. Try again.");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Project was not created. Try again.");
    }
  };

  const handleDeleteProject = async () => {
    if (!confirmDelete) {
      return;
    }

    const { id, title: projectTitle } = confirmDelete;
    setDeletingId(id);
    try {
      await deleteProject({
        variables: { id },
        optimisticResponse: { deleteProject: true },
      });
      pushToast({ title: "Project deleted", message: projectTitle, tone: "success" });
    } catch {
      // handled in onError
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <AppShell
      title="Your projects"
      subtitle="Projects"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          New project
        </button>
      }
    >
      {loading ? <AppPageSpinner label="Loading projects…" /> : null}

      {error ? (
        <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Failed to load projects: {error.message}
        </p>
      ) : null}

      {!loading && projects.length === 0 && !error ? (
        <p className="glass-card rounded-2xl px-6 py-8 text-center text-sm text-violet-100/80">
          No projects yet. Create your first board to get started.
        </p>
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
              <button
                type="button"
                className="rounded-full border border-rose-500/40 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-400 disabled:opacity-60"
                onClick={() => setConfirmDelete({ id: project.id, title: project.title })}
                disabled={creating || deleting}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <article key={project.id} className="glass-card rounded-2xl p-5 transition hover:bg-white/12">
            <h2 className="text-lg font-semibold text-white">{project.title}</h2>
            <p className="mt-2 text-sm text-violet-200/70">Updated {formatDate(project.updatedAt)}</p>
            <div className="mt-4 flex gap-3">
              <Link
                to={`/editor?projectId=${project.id}`}
                className="rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white"
              >
                Open
              </Link>
            </div>
          </article>
        ))}
      </section>

      {(creating || deletingId) && (
        <BlockingOverlay label={deletingId ? "Deleting project..." : "Creating project..."} />
      )}

      {createModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-violet-950 p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="create-project-title" className="text-lg font-semibold text-white">
              New project
            </h2>
            <p className="mt-1 text-sm text-violet-200/70">Name your board and pick a canvas size.</p>

            <label className="mt-5 block text-sm font-medium text-violet-100">
              Title
              <input
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-violet-100">
                Width (px)
                <input
                  type="number"
                  min={1}
                  max={10000}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </label>
              <label className="text-sm font-medium text-violet-100">
                Height (px)
                <input
                  type="number"
                  min={1}
                  max={10000}
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                />
              </label>
            </div>

            {formError ? <p className="mt-3 text-sm text-rose-300">{formError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-violet-100 hover:bg-white/10"
                onClick={closeCreateModal}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                onClick={() => void handleSubmitCreate()}
                disabled={creating}
              >
                {creating ? "Creating…" : "Create & open"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete project?"
        description="This will permanently remove the project and its versions."
        confirmLabel="Delete"
        confirmTone="danger"
        busy={Boolean(deletingId)}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void handleDeleteProject()}
      />
    </AppShell>
  );
}