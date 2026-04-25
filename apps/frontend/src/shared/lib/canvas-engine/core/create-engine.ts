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
  replaceScene(nextScene: SerializableSceneState): void;
  addNode(node: SceneNode, options?: { index?: number }): void;
  removeNode(nodeId: NodeId): void;
  updateNode(nodeId: NodeId, updater: SceneNodeUpdater): void;
  batchUpdate(transaction: (ops: SceneBatchOperations) => void): void;
  setSelection(nodeIds: NodeId[]): void;
  setTool(tool: ToolName): void;
}

export function createCanvasEngine(
  initialSceneState: SerializableSceneState = createEmptySerializableSceneState(),
): CanvasEngine {
  const runtime: RuntimeSceneState = createRuntimeSceneState(initialSceneState);
  const events = new EngineEventBus();

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
    replaceScene(nextScene: SerializableSceneState): void {
      const dirtyNodeIds = runtime.sceneModel.replaceWith(nextScene);
      runtime.dirtyNodeIds = new Set(dirtyNodeIds);
      events.emit("scene:changed", { reason: "replace-scene" });
    },
    addNode(node: SceneNode, options?: { index?: number }): void {
      const dirtyNodeIds = runtime.sceneModel.addNode(node, options);
      runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
      events.emit("scene:changed", { reason: "node-add" });
    },
    removeNode(nodeId: NodeId): void {
      const dirtyNodeIds = runtime.sceneModel.removeNode(nodeId);
      if (dirtyNodeIds.length === 0) {
        return;
      }

      runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
      runtime.selectedNodeIds.delete(nodeId);
      events.emit("scene:changed", { reason: "node-remove" });
      events.emit("selection:changed", { selectedNodeIds: [...runtime.selectedNodeIds] });
    },
    updateNode(nodeId: NodeId, updater: SceneNodeUpdater): void {
      const dirtyNodeIds = runtime.sceneModel.updateNode(nodeId, updater);
      if (dirtyNodeIds.length === 0) {
        return;
      }

      runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
      events.emit("scene:changed", { reason: "node-update" });
    },
    batchUpdate(transaction: (ops: SceneBatchOperations) => void): void {
      const dirtyNodeIds = runtime.sceneModel.batchUpdate(transaction);
      if (dirtyNodeIds.length === 0) {
        return;
      }

      runtime.dirtyNodeIds = new Set([...runtime.dirtyNodeIds, ...dirtyNodeIds]);
      events.emit("scene:changed", { reason: "batch-update" });
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
  };
}