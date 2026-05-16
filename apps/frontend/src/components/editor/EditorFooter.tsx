import type { FC } from "react";
import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { Download, FileJson, History, Image as ImageIcon, Save, Share2, Sparkles } from "lucide-react";

import {
  CREATE_SHARE_LINK_MUTATION,
  CREATE_VERSION_MUTATION,
  EXPORT_PNG_MUTATION,
  RESTORE_VERSION_MUTATION,
  VERSIONS_QUERY,
} from "@/graphql/projects.graphql";
import {
  CREATE_USER_TEMPLATE_MUTATION,
  USER_TEMPLATES_QUERY,
} from "@/graphql/templates.graphql";
import { serializeSceneToJson } from "@/shared/lib/canvas-engine";
import { useOptionalEditorWorkspace } from "./editor-workspace-context";

function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const EditorFooter: FC = () => {
  const navigate = useNavigate();
  const workspace = useOptionalEditorWorkspace();
  const [busy, setBusy] = useState<string | null>(null);

  const [createVersion] = useMutation(CREATE_VERSION_MUTATION);
  const [restoreVersion] = useMutation(RESTORE_VERSION_MUTATION);
  const [exportPng] = useMutation(EXPORT_PNG_MUTATION);
  const [createShareLink] = useMutation(CREATE_SHARE_LINK_MUTATION);
  const [createUserTemplate] = useMutation(CREATE_USER_TEMPLATE_MUTATION, {
    refetchQueries: [{ query: USER_TEMPLATES_QUERY }],
  });

  const projectId = workspace?.projectId ?? null;
  const { data: versionsData, refetch: refetchVersions } = useQuery(VERSIONS_QUERY, {
    variables: { projectId: projectId ?? "" },
    skip: !projectId,
  });

  if (!workspace) {
    return (
      <footer className="border-t border-violet-200/60 bg-violet-950/95 px-4 py-3 text-sm text-violet-200 shadow-sm">
        Editor footer
      </footer>
    );
  }

  const {
    engine,
    projectId: pid,
    projectTitle,
    projectWidth,
    projectHeight,
    autosaveLabel,
    saveNow,
    applyProjectContent,
  } = workspace;

  const versions = (versionsData as { versions?: Array<{ id: string; label?: string | null; createdAt: string }> } | undefined)?.versions ?? [];

  const handleSave = async () => {
    setBusy("save");
    try {
      await saveNow();
    } finally {
      setBusy(null);
    }
  };

  const handleSnapshot = async () => {
    if (!pid) return;
    const label = window.prompt("Version label (optional)", "") ?? "";
    setBusy("version");
    try {
      await createVersion({ variables: { projectId: pid, label: label || undefined } });
      await refetchVersions();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed to create version");
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!pid) return;
    if (!window.confirm("Replace current canvas with this version?")) return;
    setBusy("restore");
    try {
      const res = await restoreVersion({ variables: { projectId: pid, versionId } });
      const content = (res.data as { restoreVersion?: { content?: unknown } })?.restoreVersion?.content;
      applyProjectContent(content ?? null);
      await refetchVersions();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(null);
    }
  };

  const handleExportJson = () => {
    const json = serializeSceneToJson(engine.getSerializableState());
    downloadTextFile(`${(projectTitle ?? "scene").replace(/\s+/g, "-")}.webster-scene.json`, json);
  };

  const handleExportPng = async () => {
    if (!pid) {
      window.alert("Open a saved project to export PNG from the server.");
      return;
    }
    setBusy("png");
    try {
      await saveNow();
      const res = await exportPng({ variables: { projectId: pid } });
      const url = (res.data as { exportPng?: { url?: string } })?.exportPng?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    if (!pid) return;
    setBusy("share");
    try {
      const res = await createShareLink({ variables: { projectId: pid, expiresInHours: 72 } });
      const url = (res.data as { createShareLink?: { url?: string } })?.createShareLink?.url;
      if (url) {
        await navigator.clipboard.writeText(url);
        window.alert(`Share link copied to clipboard:\n${url}`);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Share link failed");
    } finally {
      setBusy(null);
    }
  };

  const handleSaveTemplate = async () => {
    const title = window.prompt("Template title", projectTitle ?? "My template") ?? "";
    if (!title.trim()) return;
    setBusy("template");
    try {
      const scene = engine.getSerializableState();
      await createUserTemplate({
        variables: {
          input: {
            title: title.trim(),
            width: projectWidth,
            height: projectHeight,
            content: JSON.parse(serializeSceneToJson(scene)) as Record<string, unknown>,
            isPublic: false,
          },
        },
      });
      if (window.confirm("Template saved. Open My templates now?")) {
        navigate("/templates");
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Template save failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <footer className="border-t border-violet-300/20 bg-linear-to-r from-violet-950 via-violet-900 to-fuchsia-950 px-4 py-3 text-violet-100 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1 text-xs text-violet-200/80">
          <div className="truncate font-medium text-white">{projectTitle ?? "Project"}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{autosaveLabel || (busy ? `${busy}…` : "Ready")}</span>
            {pid ? (
              <span className="flex items-center gap-1 text-slate-500">
                <History size={12} />
                {versions.length} snapshot{versions.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          {pid && versions.length > 0 ? (
            <div className="flex max-w-full flex-wrap gap-1 pt-1">
              {versions.slice(0, 8).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void handleRestore(v.id)}
                  className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  title={v.createdAt}
                >
                  {v.label || new Date(v.createdAt).toLocaleString()}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleSave()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <Save size={16} />
            Save now
          </button>
          <button
            type="button"
            disabled={!pid || Boolean(busy)}
            onClick={() => void handleSnapshot()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <Sparkles size={16} />
            Snapshot
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={handleExportJson}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <FileJson size={16} />
            JSON
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleExportPng()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <ImageIcon size={16} />
            PNG
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void handleSaveTemplate()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <Download size={16} />
            Template
          </button>
          <button
            type="button"
            disabled={!pid || Boolean(busy)}
            onClick={() => void handleShare()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-violet-100 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </footer>
  );
};
