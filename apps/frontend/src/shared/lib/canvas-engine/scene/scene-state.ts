import { DEFAULT_LAYER_ID, type LayerId, type NodeId, type ToolName } from "../core/types";
import type { SceneNode } from "./scene-node";
import { createSceneModel, normalizeSerializableSceneState, type SceneModel } from "./scene-model";

export interface SerializableSceneState {
  version: number;
  nodes: Record<NodeId, SceneNode>;
  nodeOrder: NodeId[];
  layerOrder: LayerId[];
}

export interface RuntimeSceneState {
  sceneModel: SceneModel;
  selectedNodeIds: Set<NodeId>;
  hoveredNodeId: NodeId | null;
  activeTool: ToolName;
  dirtyNodeIds: Set<NodeId>;
}

export function createEmptySerializableSceneState(): SerializableSceneState {
  return {
    version: 1,
    nodes: {},
    nodeOrder: [],
    layerOrder: [DEFAULT_LAYER_ID],
  };
}

export function createRuntimeSceneState(
  serializable: SerializableSceneState = createEmptySerializableSceneState(),
): RuntimeSceneState {
  return {
    sceneModel: createSceneModel(normalizeSerializableSceneState(serializable)),
    selectedNodeIds: new Set<NodeId>(),
    hoveredNodeId: null,
    activeTool: "select",
    dirtyNodeIds: new Set<NodeId>(),
  };
}