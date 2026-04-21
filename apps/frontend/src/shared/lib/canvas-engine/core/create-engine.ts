import { EngineEventBus } from "./event-bus";
import type { NodeId, ToolName } from "./types";
import {
  createEmptySerializableSceneState,
  createRuntimeSceneState,
  type RuntimeSceneState,
  type SerializableSceneState,
} from "../scene/scene-state";

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
      return runtime.serializable;
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
      runtime.serializable = nextScene;
      runtime.dirtyNodeIds = new Set(nextScene.nodeOrder);
      events.emit("scene:changed", { reason: "replace-scene" });
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