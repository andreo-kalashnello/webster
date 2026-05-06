import { useCallback, useEffect, useState, useMemo } from "react";
import type { CanvasEngine } from "../core/create-engine";
import type { SerializableSceneState } from "../scene/scene-state";
import type { NodeId } from "../core/types";

/**
 * Subscribe to the engine's scene changes. Returns the latest serializable
 * scene state and re-renders whenever the scene mutates.
 */
export function useEngineScene(engine: CanvasEngine): SerializableSceneState {
  const [scene, setScene] = useState<SerializableSceneState>(() => engine.getSerializableState());

  useEffect(() => {
    // Sync immediately in case we mounted after a change.
    setScene(engine.getSerializableState());

    const unsubscribe = engine.events.on("scene:changed", () => {
      setScene(engine.getSerializableState());
    });

    return unsubscribe;
  }, [engine]);

  return scene;
}

/**
 * Subscribe to the engine's selection changes. Returns the latest list of
 * selected node IDs and re-renders whenever the selection changes.
 */
export function useEngineSelection(engine: CanvasEngine): NodeId[] {
  const [selectedIds, setSelectedIds] = useState<NodeId[]>(
    () => engine.getRuntimeSnapshot().selectedNodeIds,
  );

  useEffect(() => {
    setSelectedIds(engine.getRuntimeSnapshot().selectedNodeIds);

    const unsubscribe = engine.events.on("selection:changed", ({ selectedNodeIds }) => {
      setSelectedIds(selectedNodeIds);
    });

    return unsubscribe;
  }, [engine]);

  return selectedIds;
}

/**
 * Convenient all-in-one hook: returns scene state, selection and stable action
 * callbacks for the most common UI operations.
 */
export function useEngineApi(engine: CanvasEngine) {
  const scene = useEngineScene(engine);
  const selectedIds = useEngineSelection(engine);

  const select = useCallback(
    (nodeIds: NodeId[]) => engine.setSelection(nodeIds),
    [engine],
  );

  const move = useCallback(
    (nodeId: NodeId, position: { x: number; y: number }) => engine.move(nodeId, position),
    [engine],
  );

  const setTool = useCallback(
    (tool: Parameters<typeof engine.setTool>[0]) => engine.setTool(tool),
    [engine],
  );

  const undo = useCallback(() => engine.undo(), [engine]);
  const redo = useCallback(() => engine.redo(), [engine]);

  const exportJson = useCallback(() => engine.exportSceneJson(), [engine]);
  const importJson = useCallback((json: string) => engine.importSceneJson(json), [engine]);

  return useMemo(
    () => ({ scene, selectedIds, select, move, setTool, undo, redo, exportJson, importJson }),
    [scene, selectedIds, select, move, setTool, undo, redo, exportJson, importJson],
  );
}
