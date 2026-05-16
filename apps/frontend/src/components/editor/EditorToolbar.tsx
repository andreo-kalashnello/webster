import type { FC } from "react";
import { useEffect, useReducer } from "react";
import { Grid3x3, ZoomIn, ZoomOut } from "lucide-react";
import { Link } from "react-router-dom";

import { BrandLogo } from "@/components/layout/BrandLogo";
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
      <header className="border-b border-violet-200/60 bg-white/90 px-4 py-3 text-sm text-violet-600 shadow-sm backdrop-blur-md">
        Editor shell (no canvas workspace)
      </header>
    );
  }

  const { zoomIn, zoomOut, zoomReset, cameraZoomPercent, gridEnabled, setGridEnabled, projectTitle } =
    workspace;

  return (
    <header className="border-b border-violet-200/60 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-4 overflow-x-auto px-4 py-2.5">
        <div className="hidden shrink-0 sm:block">
          <BrandLogo />
        </div>
        {projectTitle ? (
          <p className="hidden max-w-48 truncate text-sm font-semibold text-violet-900 md:block">
            {projectTitle}
          </p>
        ) : null}

        <div className="ml-auto flex items-center gap-2 border-r border-violet-200/80 pr-4">
          <button
            type="button"
            onClick={zoomOut}
            className="rounded-lg p-2 text-violet-800 transition hover:bg-violet-100"
            title="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            type="button"
            onClick={zoomReset}
            className="min-w-14 rounded-lg px-3 py-2 text-sm font-semibold text-violet-900 transition hover:bg-violet-100"
          >
            {cameraZoomPercent}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="rounded-lg p-2 text-violet-800 transition hover:bg-violet-100"
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
              ? "flex items-center gap-2 rounded-lg bg-violet-100 px-3 py-2 text-violet-800"
              : "flex items-center gap-2 rounded-lg px-3 py-2 text-violet-800 transition hover:bg-violet-50"
          }
          title="Toggle grid"
        >
          <Grid3x3 size={18} />
          <span className="text-sm font-medium">Grid</span>
        </button>

        <Link
          to="/"
          className="rounded-full border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
        >
          Home
        </Link>
      </div>
    </header>
  );
};
