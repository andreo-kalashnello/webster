import type { FC } from "react";
import { useEffect, useReducer } from "react";
import { Grid3x3, ZoomIn, ZoomOut } from "lucide-react";

import { useOptionalEditorWorkspace } from "./editor-workspace-context";

export const EditorToolbar: FC = () => {
  const workspace = useOptionalEditorWorkspace();
  const [, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!workspace) return;
    const { engine } = workspace;
    const offScene = engine.events.on("scene:changed", bump);
    return () => {
      offScene();
    };
  }, [workspace]);

  if (!workspace) {
    return (
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="px-4 py-3 text-sm text-slate-500">Editor shell (no canvas workspace)</div>
      </header>
    );
  }

  const { zoomIn, zoomOut, zoomReset, cameraZoomPercent, gridEnabled, setGridEnabled } = workspace;

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 overflow-x-auto px-4 py-3">
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
          <button
            type="button"
            onClick={zoomOut}
            className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100"
            title="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            type="button"
            onClick={zoomReset}
            className="min-w-14 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            {cameraZoomPercent}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100"
            title="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setGridEnabled(!gridEnabled)}
          className={
            gridEnabled
              ? "flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-blue-700 transition-colors"
              : "flex items-center gap-2 rounded-lg px-3 py-2 text-slate-700 transition-colors hover:bg-slate-100"
          }
          title="Toggle grid"
        >
          <Grid3x3 size={18} />
          <span className="text-sm font-medium">Grid</span>
        </button>
      </div>
    </header>
  );
};
