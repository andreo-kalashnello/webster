import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { LayoutTemplate, Pencil, Plus, Trash2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { AppPageSpinner } from "@/components/ui/PageSpinner";
import { createEmptySerializableSceneState } from "@/shared/lib/canvas-engine";
import {
  CREATE_PROJECT_FROM_TEMPLATE_MUTATION,
  CREATE_USER_TEMPLATE_MUTATION,
  DELETE_USER_TEMPLATE_MUTATION,
  UPDATE_USER_TEMPLATE_MUTATION,
  USER_TEMPLATES_QUERY,
} from "@/graphql/templates.graphql";

type TemplateItem = {
  id: string;
  title: string;
  width?: number;
  height?: number;
  updatedAt?: string;
  isPublic?: boolean;
};

const EMPTY_SCENE = createEmptySerializableSceneState();

function formatDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function TemplatesPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<TemplateItem | null>(null);
  const [title, setTitle] = useState("");
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useQuery(USER_TEMPLATES_QUERY);

  const [createFromTemplate, { loading: creatingProject }] = useMutation(
    CREATE_PROJECT_FROM_TEMPLATE_MUTATION,
  );
  const [createUserTemplate, { loading: creatingTemplate }] = useMutation(CREATE_USER_TEMPLATE_MUTATION, {
    refetchQueries: [{ query: USER_TEMPLATES_QUERY }],
  });
  const [updateUserTemplate, { loading: updatingTemplate }] = useMutation(UPDATE_USER_TEMPLATE_MUTATION, {
    refetchQueries: [{ query: USER_TEMPLATES_QUERY }],
  });
  const [deleteUserTemplate, { loading: deletingTemplate }] = useMutation(DELETE_USER_TEMPLATE_MUTATION, {
    refetchQueries: [{ query: USER_TEMPLATES_QUERY }],
  });

  const templates =
    (data as { userTemplates?: TemplateItem[] } | undefined)?.userTemplates ?? [];

  const busy = creatingProject || creatingTemplate || updatingTemplate || deletingTemplate;

  const openCreateModal = useCallback(() => {
    setTitle(`Template ${new Date().toLocaleDateString()}`);
    setWidth(800);
    setHeight(600);
    setFormError(null);
    setCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setFormError(null);
  }, []);

  const openEditModal = useCallback((template: TemplateItem) => {
    setEditTemplate(template);
    setTitle(template.title);
    setWidth(template.width ?? 800);
    setHeight(template.height ?? 600);
    setFormError(null);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditTemplate(null);
    setFormError(null);
  }, []);

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setFormError("Title is required.");
      return false;
    }
    if (!Number.isFinite(width) || width < 1 || width > 10000) {
      setFormError("Width must be between 1 and 10000.");
      return false;
    }
    if (!Number.isFinite(height) || height < 1 || height > 10000) {
      setFormError("Height must be between 1 and 10000.");
      return false;
    }
    return true;
  };

  const handleCreateTemplate = async () => {
    if (!validateForm()) return;
    setFormError(null);
    try {
      await createUserTemplate({
        variables: {
          input: {
            title: title.trim(),
            width: Math.floor(width),
            height: Math.floor(height),
            content: EMPTY_SCENE,
            isPublic: false,
          },
        },
      });
      closeCreateModal();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create template.");
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editTemplate || !validateForm()) return;
    setFormError(null);
    try {
      await updateUserTemplate({
        variables: {
          id: editTemplate.id,
          input: {
            title: title.trim(),
            width: Math.floor(width),
            height: Math.floor(height),
          },
        },
      });
      closeEditModal();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to update template.");
    }
  };

  const handleDeleteTemplate = async (template: TemplateItem) => {
    if (!window.confirm(`Delete template "${template.title}"? This cannot be undone.`)) {
      return;
    }
    setActionError(null);
    try {
      await deleteUserTemplate({ variables: { id: template.id } });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to delete template.");
    }
  };

  const handleUseTemplate = async (template: TemplateItem) => {
    setActionError(null);
    const projectTitle = window.prompt("Project title", template.title)?.trim();
    if (projectTitle === "") return;

    try {
      const result = await createFromTemplate({
        variables: {
          templateId: template.id,
          title: projectTitle || template.title,
        },
      });
      const projectId = (result.data as { createProjectFromTemplate?: { id: string } } | undefined)
        ?.createProjectFromTemplate?.id;
      if (projectId) {
        navigate(`/editor?projectId=${projectId}`);
      } else {
        setActionError("Project was not created from template.");
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to create project from template.");
    }
  };

  return (
    <AppShell
      title="My templates"
      subtitle="Templates"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          New template
        </button>
      }
    >
      <p className="mb-6 max-w-2xl text-sm text-violet-100/75">
        Save layouts from the editor footer, or create a blank template here. Use a template to spin up a new
        project with the same canvas size and scene content.
      </p>

      {actionError ? (
        <p className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {actionError}
        </p>
      ) : null}

      {loading ? <AppPageSpinner label="Loading your templates…" /> : null}

      {error ? (
        <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          Failed to load templates: {error.message}
          <button
            type="button"
            className="ml-3 font-semibold text-cyan-300 underline"
            onClick={() => void refetch()}
          >
            Retry
          </button>
        </p>
      ) : null}

      {!loading && templates.length === 0 && !error ? (
        <div className="glass-card rounded-2xl px-6 py-10 text-center">
          <LayoutTemplate className="mx-auto h-10 w-10 text-cyan-300/80" />
          <p className="mt-4 text-sm text-violet-100/80">You have no templates yet.</p>
          <p className="mt-2 text-xs text-violet-200/60">
            Create one below or save the current scene from the editor (footer → Template).
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-6 rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Create first template
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <article
            key={template.id}
            className="glass-card flex flex-col rounded-2xl p-5 transition hover:bg-white/12"
          >
            <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-linear-to-br from-violet-500/30 via-fuchsia-500/20 to-cyan-500/25">
              <LayoutTemplate className="h-8 w-8 text-white/90" />
            </div>
            <h2 className="text-lg font-semibold text-white">{template.title}</h2>
            <p className="mt-1 text-xs text-violet-200/70">
              {template.width ?? 800} × {template.height ?? 600} px · Updated {formatDate(template.updatedAt)}
            </p>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleUseTemplate(template)}
                className="rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {creatingProject ? "Creating…" : "New project"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => openEditModal(template)}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-2 text-sm text-violet-100 hover:bg-white/10 disabled:opacity-60"
                title="Rename / resize"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDeleteTemplate(template)}
                className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
                title="Delete template"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>

      {!loading && templates.length > 0 ? (
        <p className="mt-8 text-center text-xs text-violet-200/50">
          Tip: open a project in the{" "}
          <Link to="/editor" className="text-cyan-300 hover:underline">
            editor
          </Link>{" "}
          and use <strong className="font-semibold text-violet-100">Template</strong> in the footer to save the
          current scene.
        </p>
      ) : null}

      {createModalOpen ? (
        <TemplateFormModal
          title="New template"
          description="Creates an empty canvas preset you can open as a new project later."
          formTitle={title}
          width={width}
          height={height}
          formError={formError}
          busy={creatingTemplate}
          submitLabel="Create template"
          onTitleChange={setTitle}
          onWidthChange={setWidth}
          onHeightChange={setHeight}
          onClose={closeCreateModal}
          onSubmit={() => void handleCreateTemplate()}
        />
      ) : null}

      {editTemplate ? (
        <TemplateFormModal
          title="Edit template"
          description="Update the display name and default canvas size. Scene content is unchanged."
          formTitle={title}
          width={width}
          height={height}
          formError={formError}
          busy={updatingTemplate}
          submitLabel="Save changes"
          onTitleChange={setTitle}
          onWidthChange={setWidth}
          onHeightChange={setHeight}
          onClose={closeEditModal}
          onSubmit={() => void handleUpdateTemplate()}
        />
      ) : null}
    </AppShell>
  );
}

type TemplateFormModalProps = {
  title: string;
  description: string;
  formTitle: string;
  width: number;
  height: number;
  formError: string | null;
  busy: boolean;
  submitLabel: string;
  onTitleChange: (v: string) => void;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onClose: () => void;
  onSubmit: () => void;
};

function TemplateFormModal({
  title,
  description,
  formTitle,
  width,
  height,
  formError,
  busy,
  submitLabel,
  onTitleChange,
  onWidthChange,
  onHeightChange,
  onClose,
  onSubmit,
}: TemplateFormModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-violet-950 p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-violet-200/70">{description}</p>

        <label className="mt-5 block text-sm font-medium text-violet-100">
          Title
          <input
            className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
            value={formTitle}
            onChange={(e) => onTitleChange(e.target.value)}
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
              onChange={(e) => onWidthChange(Number(e.target.value))}
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
              onChange={(e) => onHeightChange(Number(e.target.value))}
            />
          </label>
        </div>

        {formError ? <p className="mt-3 text-sm text-rose-300">{formError}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-violet-100 hover:bg-white/10"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-full bg-linear-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={onSubmit}
            disabled={busy}
          >
            {busy ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
