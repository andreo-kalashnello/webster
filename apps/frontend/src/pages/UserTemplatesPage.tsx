import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";

import {
  CREATE_PROJECT_FROM_TEMPLATE_MUTATION,
  DELETE_USER_TEMPLATE_MUTATION,
  USER_TEMPLATES_QUERY,
} from "../graphql/templates.graphql";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { BlockingOverlay } from "@/components/ui/BlockingOverlay";
import { useToastStore } from "@/shared/stores/toast.store";
import { useState } from "react";

function formatDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function UserTemplatesPage() {
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.pushToast);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data, loading, error } = useQuery(USER_TEMPLATES_QUERY);
  const [createFromTemplate, { loading: creating }] = useMutation(
    CREATE_PROJECT_FROM_TEMPLATE_MUTATION,
    {
      onError: (err) => {
        pushToast({
          title: "Template failed",
          message: err.message,
          tone: "error",
        });
      },
    },
  );

  const [deleteTemplate, { loading: deleting }] = useMutation(DELETE_USER_TEMPLATE_MUTATION, {
    update: (cache, { data: result }, options) => {
      if (!result?.deleteUserTemplate) {
        return;
      }

      const deletedId = options.variables?.id as string | undefined;
      if (!deletedId) {
        return;
      }

      cache.updateQuery({ query: USER_TEMPLATES_QUERY }, (prev) => {
        if (!prev?.userTemplates) {
          return prev;
        }

        return {
          ...prev,
          userTemplates: prev.userTemplates.filter(
            (template: { id: string }) => template.id !== deletedId,
          ),
        };
      });
    },
    onError: (err) => {
      pushToast({ title: "Delete failed", message: err.message, tone: "error" });
    },
  });

  const templates = data?.userTemplates ?? [];

  const handleUseTemplate = async (templateId: string, title?: string) => {
    try {
      const result = await createFromTemplate({
        variables: { templateId, title },
      });

      const projectId = result.data?.createProjectFromTemplate?.id as string | undefined;
      if (projectId) {
        pushToast({ title: "Project created", tone: "success" });
      }
      navigate(projectId ? `/editor?projectId=${projectId}` : "/editor");
    } catch {
      // handled in onError
    }
  };

  const handleDeleteTemplate = async () => {
    if (!confirmDelete) {
      return;
    }

    const { id, title } = confirmDelete;
    setDeletingId(id);
    try {
      await deleteTemplate({
        variables: { id },
        optimisticResponse: { deleteUserTemplate: true },
      });
      pushToast({ title: "Template deleted", message: title, tone: "success" });
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
                <button
                  type="button"
                  className="rounded-full border border-rose-500/40 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-400 disabled:opacity-60"
                  onClick={() => setConfirmDelete({ id: template.id, title: template.title })}
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
        <BlockingOverlay label={deletingId ? "Deleting template..." : "Preparing template..."} />
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete template?"
        description="This will permanently remove the template."
        confirmLabel="Delete"
        confirmTone="danger"
        busy={Boolean(deletingId)}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => void handleDeleteTemplate()}
      />
    </div>
  );
}