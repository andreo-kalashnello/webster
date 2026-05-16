import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { useCallback, useEffect, useState } from "react";

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

  const projects = data?.projects?.items ?? [];

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
              onClick={openCreateModal}
              type="button"
              disabled={creating}
            >
              New project
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
      </div>

      {(creating || deletingId) && (
        <BlockingOverlay label={deletingId ? "Deleting project..." : "Creating project..."} />
      )}

      {createModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2 id="create-project-title" className="text-lg font-semibold text-white">
              New project
            </h2>
            <p className="mt-1 text-sm text-slate-400">Choose a name and canvas size. You can change the title later.</p>

            <label className="mt-5 block text-sm font-medium text-slate-300">
              Title
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-slate-300">
                Width (px)
                <input
                  type="number"
                  min={1}
                  max={10000}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </label>
              <label className="text-sm font-medium text-slate-300">
                Height (px)
                <input
                  type="number"
                  min={1}
                  max={10000}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                />
              </label>
            </div>

            {formError ? <p className="mt-3 text-sm text-rose-300">{formError}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-400"
                onClick={closeCreateModal}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 disabled:opacity-60"
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
    </div>
  );
}