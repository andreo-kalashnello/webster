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
  type Mat2D,
  applyMat2DToPoint,
  composeMat2D,
  composeNodeLocalToWorldMatrix,
  createIdentityMat2D,
  decomposeMat2D,
  getAabbOfPoints,
  getDefaultNodePivot,
  getNodeWorldBounds,
  getNodeWorldHitbox,
  getRectCorners,
  invertMat2D,
  isPointInConvexPolygon,
  isPointInNodeHitbox,
  multiplyMat2D,
  rotateMat2D,
  rotateTransformAroundPivot,
  scaleMat2D,
  scaleTransformAroundAnchor,
  translateMat2D,
} from "./utils/mat2d";
export {
  getNodeDefaultPivotWorld,
  getSelectionWorldBounds,
  hitTestNodeAtWorldPoint,
  pickTopMostNodeAtWorldPoint,
  unionRects,
  worldPointToNodeLocalPoint,
} from "./utils/hit-test";
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
export {
  SCENE_FORMAT_VERSION,
  deserializeSceneFromJson,
  serializeSceneToJson,
  type DeserializeResult,
} from "./scene/serialization";
export { ENGINE_TOOLS, ENGINE_SHAPE_TOOLS, type ToolDescriptor } from "./tools";
export { createLayerId, createNodeId } from "./utils/id";
export { createStressScene } from "./utils/stress";
export { useEngineApi, useEngineScene, useEngineSelection } from "./react/useEngineApi";