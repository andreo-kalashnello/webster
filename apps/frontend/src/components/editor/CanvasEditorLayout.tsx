import { FC, ReactNode } from "react";

import { EditorToolbar } from "./EditorToolbar";
import { CanvasArea } from "./CanvasArea";
import { PropertiesPanel } from "./PropertiesPanel";
import { EditorFooter } from "./EditorFooter";

interface CanvasEditorLayoutProps {
  children?: ReactNode;
}

export const CanvasEditorLayout: FC<CanvasEditorLayoutProps> = () => {
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Toolbar */}
      <EditorToolbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Canvas */}
        <CanvasArea />

        {/* Properties Panel - Responsive */}
        <PropertiesPanel />
      </div>

      {/* Footer */}
      <EditorFooter />
    </div>
  );
};