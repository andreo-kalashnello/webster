import { useCallback, useEffect } from "react";
import { useEditorStore } from "@/shared/stores/editor.store";

export const useEditorKeyboardShortcuts = () => {
  const { clearSelection, toggleGrid } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape - clear selection
      if (event.key === "Escape") {
        event.preventDefault();
        clearSelection();
        return;
      }

      // Ctrl/Cmd + G - toggle grid
      if ((event.ctrlKey || event.metaKey) && event.key === "g") {
        event.preventDefault();
        toggleGrid();
        return;
      }

      // Delete - delete selected objects
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        // Trigger delete action via engine if needed
        return;
      }

      // Ctrl/Cmd + Z - undo
      if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        // Trigger undo
        return;
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y - redo
      if (
        ((event.ctrlKey || event.metaKey) && event.key === "z" && event.shiftKey) ||
        ((event.ctrlKey || event.metaKey) && event.key === "y")
      ) {
        event.preventDefault();
        // Trigger redo
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearSelection, toggleGrid]);
};

export const useEditorZoomShortcuts = () => {
  const { setZoom, toolbar } = useEditorStore();

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();

      // Determine zoom direction
      const direction = event.deltaY > 0 ? -1 : 1;
      const step = 10;

      setZoom(toolbar.zoom + direction * step);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [setZoom, toolbar.zoom]);
};

export const useToolbar = () => {
  return useEditorStore((state) => state.toolbar);
};

export const useToolbarActions = () => {
  return useEditorStore((state) => ({
    setActiveTool: state.setActiveTool,
    setZoom: state.setZoom,
    toggleGrid: state.toggleGrid,
    setGridSize: state.setGridSize,
  }));
};

export const usePropertiesPanel = () => {
  return useEditorStore((state) => state.propertiesPanel);
};

export const usePropertiesPanelActions = () => {
  return useEditorStore((state) => ({
    selectNodes: state.selectNodes,
    updateProperties: state.updateProperties,
    clearSelection: state.clearSelection,
    togglePropertiesPanel: state.togglePropertiesPanel,
  }));
};