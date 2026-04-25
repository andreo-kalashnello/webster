export { createCanvasEngine, type CanvasEngine, type EngineRuntimeSnapshot } from "./core/create-engine";
export { EngineEventBus, type EngineEventMap, type SceneChangeReason } from "./core/event-bus";
export {
  DEFAULT_LAYER_ID,
  createIdentityTransform,
  type LayerId,
  type NodeId,
  type Point,
  type Rect,
  type ToolName,
  type Transform,
} from "./core/types";
export { type Command } from "./commands";
export { CanvasRenderer, type RenderMode, type RenderStats, type RendererViewport } from "./renderer";
export { type SceneNode, type SceneNodeData, type SceneNodeStyle, type SceneNodeType } from "./scene/scene-node";
export {
  SceneModel,
  createImmutableSceneSnapshot,
  createSceneModel,
  normalizeSerializableSceneState,
  type SceneBatchOperations,
  type SceneModelSnapshot,
  type SceneNodeUpdatePatch,
  type SceneNodeUpdater,
} from "./scene/scene-model";
export {
  createEmptySerializableSceneState,
  createRuntimeSceneState,
  type RuntimeSceneState,
  type SerializableSceneState,
} from "./scene/scene-state";
export { ENGINE_TOOLS, type ToolDescriptor } from "./tools";
export { createLayerId, createNodeId } from "./utils/id";