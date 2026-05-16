import type { FC, ReactNode } from "react";

import { EditorToolbar } from "./EditorToolbar";
import { EditorToolsDock } from "./EditorToolsDock";
import { PropertiesPanel } from "./PropertiesPanel";
import { EditorFooter } from "./EditorFooter";

type CanvasEditorLayoutProps = {
  /** Live canvas surface (engine renderer + interactions). */
  canvas: ReactNode;
};

export const CanvasEditorLayout: FC<CanvasEditorLayoutProps> = ({ canvas }) => {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-linear-to-br from-violet-50 via-white to-cyan-50/40">
      <EditorToolbar />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-h-0 min-w-0 flex-1">
          {canvas}
          <EditorToolsDock />
        </div>
        <PropertiesPanel />
      </div>

      <EditorFooter />
    </div>
  );
};
