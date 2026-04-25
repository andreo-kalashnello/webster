import { useEffect, useMemo } from "react";

import { CanvasEditorLayout } from "@/components/editor";
import { useEditorStore } from "@/shared/stores/editor.store";
import { useEditorKeyboardShortcuts, useEditorZoomShortcuts } from "@/shared/hooks";
import { createCanvasEngine } from "@/shared/lib/canvas-engine";

export function CanvasEnginePage() {
  const engine = useMemo(() => createCanvasEngine(), []);
  const { selectNodes } = useEditorStore();

  // Enable keyboard shortcuts
  useEditorKeyboardShortcuts();
  useEditorZoomShortcuts();

  // Sync editor state with canvas engine
  useEffect(() => {
    const stopTool = engine.events.on("tool:changed", ({ tool }) => {
    });

    const stopSelection = engine.events.on("selection:changed", ({ selectedNodeIds }) => {
      selectNodes(selectedNodeIds);
    });

    return () => {
      stopTool();
      stopSelection();
    };
  }, [engine, selectNodes]);

  return <CanvasEditorLayout />;
}