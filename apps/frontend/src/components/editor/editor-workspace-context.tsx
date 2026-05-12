import { createContext, useContext, type ReactNode } from "react";

import type { CanvasEngine } from "@/shared/lib/canvas-engine";

export type EditorWorkspaceContextValue = {
  engine: CanvasEngine;
  projectId: string | null;
  projectTitle: string | null;
  autosaveLabel: string;
  saveNow: () => Promise<void>;
  /** Replace engine scene from API `Project.content` (after restore, etc.). */
  applyProjectContent: (content: unknown) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  /** Camera zoom as UI percent (e.g. 100 = 1x). */
  cameraZoomPercent: number;
  gridEnabled: boolean;
  setGridEnabled: (next: boolean) => void;
};

const EditorWorkspaceContext = createContext<EditorWorkspaceContextValue | null>(null);

export function EditorWorkspaceProvider({
  value,
  children,
}: {
  value: EditorWorkspaceContextValue;
  children: ReactNode;
}) {
  return <EditorWorkspaceContext.Provider value={value}>{children}</EditorWorkspaceContext.Provider>;
}

export function useEditorWorkspace(): EditorWorkspaceContextValue {
  const ctx = useContext(EditorWorkspaceContext);
  if (!ctx) {
    throw new Error("useEditorWorkspace must be used within EditorWorkspaceProvider");
  }
  return ctx;
}

export function useOptionalEditorWorkspace(): EditorWorkspaceContextValue | null {
  return useContext(EditorWorkspaceContext);
}
