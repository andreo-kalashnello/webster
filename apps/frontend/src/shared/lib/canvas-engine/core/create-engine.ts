import { EngineEventBus } from "./event-bus";
import type { NodeId, ToolName } from "./types";
import {
  createEmptySerializableSceneState,
  createRuntimeSceneState,
  type RuntimeSceneState,
  type SerializableSceneState,
} from "../scene/scene-state";
import type { SceneNode } from "../scene/scene-node";
import type { SceneBatchOperations, SceneNodeUpdater } from "../scene/scene-model";
import type { Command } from "../commands";
import { serializeSceneToJson, deserializeSceneFromJson } from "../scene/serialization";

export interface EngineRuntimeSnapshot {
  selectedNodeIds: NodeId[];
  hoveredNodeId: NodeId | null;
  activeTool: ToolName;
  dirtyNodeIds: NodeId[];
}

export interface CanvasEngine {
  events: EngineEventBus;
  getSerializableState(): SerializableSceneState;
  getRuntimeSnapshot(): EngineRuntimeSnapshot;
  replaceScene(nextScene: SerializableSceneState, options?: { history?: HistoryOptions }): void;
  addNode(node: SceneNode, options?: { index?: number; history?: HistoryOptions }): void;
  removeNode(nodeId: NodeId): void;
  updateNode(nodeId: NodeId, updater: SceneNodeUpdater, options?: { history?: HistoryOptions }): void;
  batchUpdate(transaction: (ops: SceneBatchOperations) => void, options?: { history?: HistoryOptions }): void;
  reorderNode(nodeId: NodeId, nextIndex: number, options?: { history?: HistoryOptions }): void;
  reorderLayer(layerId: string, nextIndex: number, options?: { history?: HistoryOptions }): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  setSelection(nodeIds: NodeId[]): void;
  setTool(tool: ToolName): void;
  /** Convenience: move node by setting bounds.x/y. */
  move(nodeId: NodeId, position: { x: number; y: number }, options?: { history?: HistoryOptions }): void;
  /** Convenience: apply full transform to a node. */
  setNodeTransform(nodeId: NodeId, transform: import("./types").Transform, options?: { history?: HistoryOptions }): void;
  /** Convenience: serialize the current scene to a JSON string. */
  exportSceneJson(): string;
  /** Convenience: deserialize and load a scene from JSON. Returns true on success. */
  importSceneJson(json: string): boolean;
}

export type HistoryOptions = {
  label?: string;
  mergeKey?: string;
};

type HistoryEntry = {
  command: Command;
  timestampMs: number;
  mergeKey?: string;
};

const DEFAULT_HISTORY_LIMIT = 200;
const DEFAULT_COALESCE_WINDOW_MS = 250;

export function createCanvasEngine(
  initialSceneState: SerializableSceneState = createEmptySerializableSceneState(),
): CanvasEngine {
  const runtime: RuntimeSceneState = createRuntimeSceneState(initialSceneState);
  const events = new EngineEventBus();
  const undoStack: HistoryEntry[] = [];
  const redoStack: HistoryEntry[] = [];
  let isApplyingHistory = false;

  function isHistoryDebugEnabled(): boolean {
    // Enable in DevTools:
    // window.__WEBSTER_DEBUG_HISTORY__ = true
    return typeof window !== "undefined" && Boolean((window as unknown as { __WEBSTER_DEBUG_HISTORY__?: boolean }).__WEBSTER_DEBUG_HISTORY__);
  }

  function emitSceneChanged(reason: "replace-scene" | "node-add" | "node-remove" | "node-update" | "batch-update") {
    events.emit("scene:changed", { reason });
  }

  function applyScene(nextScene: SerializableSceneState): void {
    const dirtyNodeIds = runtime.sceneModel.replaceWith(nextScene);
    runtime.dirtyNodeIds = new Set(dirtyNodeIds);
  }

  function pushHistoryEntry(entry: HistoryEntry): void {
    redoStack.length = 0;

    const last = undoStack[undoStack.length - 1];
    if (
      entry.mergeKey &&
      last?.mergeKey === entry.mergeKey &&
      entry.timestampMs - last.timestampMs <= DEFAULT_COALESCE_WINDOW_MS
    ) {
      // Coalesce by replacing last entry with a command that keeps last.before and new.after.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prevCommand: any = last.command;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nextCommand: any = entry.command;
      if (prevCommand?.before && nextCommand?.after) {
        last.command = makeSceneSnapshotCommand({
          id: prevCommand.id,
          label: prevCommand.label,
          before: prevCommand.before,
          after: nextCommand.after,
        });
        last.timestampMs = entry.timestampMs;
        if (isHistoryDebugEnabled()) {
          console.debug("[engine-history] coalesced", { mergeKey: entry.mergeKey, label: prevCommand.label, undoDepth: undoStack.length });
        }
        return;
      }
    }

    undoStack.push(entry);
    if (undoStack.length > DEFAULT_HISTORY_LIMIT) {
      undoStack.splice(0, undoStack.length - DEFAULT_HISTORY_LIMIT);
    }

    if (isHistoryDebugEnabled()) {
      console.debug("[engine-history] push", { label: entry.command.label, mergeKey: entry.mergeKey, undoDepth: undoStack.length });
    }
  }

  function makeSceneSnapshotCommand(input: {
    id: string;
    label: string;
    before: SerializableSceneState;
    after: SerializableSceneState;
  }): Command & { before: SerializableSceneState; after: SerializableSceneState } {
    return {
      id: input.id,
      label: input.label,
      before: input.before,
      after: input.after,
      do(): void {
        applyScene(input.after);
      },
      undo(): void {
        applyScene(input.before);
      },
    };
  }

  function commitSceneCommand(
    reason: "replace-scene" | "node-add" | "node-remove" | "node-update" | "batch-update",
    apply: () => void,
    history?: HistoryOptions,
  ): void {
    if (isApplyingHistory) {
      apply();
      emitSceneChanged(reason);
      return;
    }

    const before = runtime.sceneModel.getSerializableState();
    apply();
    const after = runtime.sceneModel.getSerializableState();
    if (before.version === after.version) {
      return;
    }

    pushHistoryEntry({
      command: makeSceneSnapshotCommand({
        id: `scene:${reason}`,
        label: history?.label ?? reason,
        before,
        after,
      }),
      timestampMs: Date.now(),
      mergeKey: history?.mergeKey,
    });

    emitSceneChanged(reason);
  }

  events.emit("engine:ready", { timestamp: new Date().toISOString() });
  events.emit("scene:changed", { reason: "init" });

  return {
    events,
    getSerializableState(): SerializableSceneState {
      return runtime.sceneModel.getSerializableState();
    },
    getRuntimeSnapshot(): EngineRuntimeSnapshot {
      return {
        selectedNodeIds: [...runtime.selectedNodeIds],
        hoveredNodeId: runtime.hoveredNodeId,
        activeTool: runtime.activeTool,
        dirtyNodeIds: [...runtime.dirtyNodeIds],
      };
    },
    replaceScene(nextScene: SerializableSceneState, options?: { history?: HistoryOptions }): void {
      commitSceneCommand(
        "replace-scene",
        () => {
          applyScene(nextScene);
        },
        options?.history,
      );
    },
    addNode(node: SceneNode, options?: { index?: number; history?: HistoryOptions }): void {
      commitSceneCommand(
        "node-add",
        () => {
          const dirtyNodeIds = runtime.sceneModel.addNode(node, { index: options?.index });
          runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
        },
        options?.history,
      );
    },
    removeNode(nodeId: NodeId): void {
      commitSceneCommand(
        "node-remove",
        () => {
          const dirtyNodeIds = runtime.sceneModel.removeNode(nodeId);
          if (dirtyNodeIds.length === 0) {
            return;
          }

          runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
          runtime.selectedNodeIds.delete(nodeId);
          events.emit("selection:changed", { selectedNodeIds: [...runtime.selectedNodeIds] });
        },
        { label: "delete", mergeKey: undefined },
      );
    },
    updateNode(nodeId: NodeId, updater: SceneNodeUpdater, options?: { history?: HistoryOptions }): void {
      commitSceneCommand(
        "node-update",
        () => {
          const dirtyNodeIds = runtime.sceneModel.updateNode(nodeId, updater);
          if (dirtyNodeIds.length === 0) {
            return;
          }

          runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
        },
        options?.history,
      );
    },
    batchUpdate(transaction: (ops: SceneBatchOperations) => void, options?: { history?: HistoryOptions }): void {
      commitSceneCommand(
        "batch-update",
        () => {
          const dirtyNodeIds = runtime.sceneModel.batchUpdate(transaction);
          if (dirtyNodeIds.length === 0) {
            return;
          }
          runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
        },
        options?.history,
      );
    },
    reorderNode(nodeId: NodeId, nextIndex: number, options?: { history?: HistoryOptions }): void {
      commitSceneCommand(
        "batch-update",
        () => {
          const dirtyNodeIds = runtime.sceneModel.reorderNode(nodeId, nextIndex);
          if (dirtyNodeIds.length === 0) {
            return;
          }
          runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
        },
        options?.history ?? { label: "node-reorder", mergeKey: `reorder:${nodeId}` },
      );
    },
    reorderLayer(layerId: string, nextIndex: number, options?: { history?: HistoryOptions }): void {
      commitSceneCommand(
        "batch-update",
        () => {
          const dirtyLayerIds = runtime.sceneModel.reorderLayer(layerId, nextIndex);
          if (dirtyLayerIds.length === 0) {
            return;
          }
          // We don't have a dedicated layer dirty tracking, just force redraw of all nodes.
          runtime.dirtyNodeIds = new Set(runtime.sceneModel.getSerializableState().nodeOrder);
        },
        options?.history ?? { label: "layer-reorder", mergeKey: `layer:${layerId}` },
      );
    },
    undo(): void {
      const entry = undoStack.pop();
      if (!entry) {
        if (isHistoryDebugEnabled()) {
          console.debug("[engine-history] undo:empty");
        }
        return;
      }
      isApplyingHistory = true;
      try {
        if (isHistoryDebugEnabled()) {
          console.debug("[engine-history] undo", { label: entry.command.label, undoDepth: undoStack.length, redoDepth: redoStack.length });
        }
        entry.command.undo();
        redoStack.push({ ...entry, timestampMs: Date.now() });
        emitSceneChanged("replace-scene");
      } finally {
        isApplyingHistory = false;
      }
    },
    redo(): void {
      const entry = redoStack.pop();
      if (!entry) {
        if (isHistoryDebugEnabled()) {
          console.debug("[engine-history] redo:empty");
        }
        return;
      }
      isApplyingHistory = true;
      try {
        if (isHistoryDebugEnabled()) {
          console.debug("[engine-history] redo", { label: entry.command.label, undoDepth: undoStack.length, redoDepth: redoStack.length });
        }
        entry.command.do();
        undoStack.push({ ...entry, timestampMs: Date.now() });
        emitSceneChanged("replace-scene");
      } finally {
        isApplyingHistory = false;
      }
    },
    canUndo(): boolean {
      return undoStack.length > 0;
    },
    canRedo(): boolean {
      return redoStack.length > 0;
    },
    setSelection(nodeIds: NodeId[]): void {
      runtime.selectedNodeIds = new Set(nodeIds);
      events.emit("selection:changed", { selectedNodeIds: [...runtime.selectedNodeIds] });
    },
    setTool(tool: ToolName): void {
      if (runtime.activeTool === tool) {
        return;
      }

      runtime.activeTool = tool;
      events.emit("tool:changed", { tool });
    },
    move(nodeId: NodeId, position: { x: number; y: number }, options?: { history?: HistoryOptions }): void {
      commitSceneCommand(
        "node-update",
        () => {
          const dirtyNodeIds = runtime.sceneModel.updateNode(nodeId, (prev) => ({
            ...prev,
            bounds: { ...prev.bounds, x: position.x, y: position.y },
          }));
          if (dirtyNodeIds.length > 0) {
            runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
          }
        },
        options?.history ?? { label: "move", mergeKey: `move:${nodeId}` },
      );
    },
    setNodeTransform(nodeId: NodeId, transform: import("./types").Transform, options?: { history?: HistoryOptions }): void {
      commitSceneCommand(
        "node-update",
        () => {
          const dirtyNodeIds = runtime.sceneModel.updateNode(nodeId, (prev) => ({
            ...prev,
            transform,
          }));
          if (dirtyNodeIds.length > 0) {
            runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
          }
        },
        options?.history ?? { label: "transform", mergeKey: `transform:${nodeId}` },
      );
    },
    exportSceneJson(): string {
      return serializeSceneToJson(runtime.sceneModel.getSerializableState());
    },
    importSceneJson(json: string): boolean {
      const result = deserializeSceneFromJson(json);
      if (!result.ok) {
        return false;
      }
      commitSceneCommand(
        "replace-scene",
        () => applyScene(result.scene),
        { label: "import-scene" },
      );
      return true;
    },
  };
}