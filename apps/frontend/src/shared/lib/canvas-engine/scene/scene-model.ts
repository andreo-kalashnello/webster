import { DEFAULT_LAYER_ID, type LayerId, type NodeId } from "../core/types";
import type { SceneNode } from "./scene-node";
import type { SerializableSceneState } from "./scene-state";

export type SceneNodeUpdatePatch = Partial<Omit<SceneNode, "id">>;
export type SceneNodeUpdater = SceneNodeUpdatePatch | ((prevNode: SceneNode) => SceneNode);

export interface SceneBatchOperations {
  addNode: (node: SceneNode, options?: { index?: number }) => void;
  removeNode: (nodeId: NodeId) => void;
  updateNode: (nodeId: NodeId, updater: SceneNodeUpdater) => void;
}

export interface SceneModelSnapshot {
  version: number;
  nodes: Map<NodeId, SceneNode>;
  nodeOrder: NodeId[];
  layerOrder: LayerId[];
}

export class SceneModel {
  private version = 1;
  private nodes = new Map<NodeId, SceneNode>();
  private nodeOrder: NodeId[] = [];
  private layerOrder: LayerId[] = [DEFAULT_LAYER_ID];

  private immutableSnapshotCache: SerializableSceneState | null = null;

  constructor(initialState?: SerializableSceneState) {
    this.replaceWith(initialState);
  }

  replaceWith(nextState: SerializableSceneState = createEmptyNormalizedSceneState()): NodeId[] {
    const normalized = normalizeSerializableSceneState(nextState);

    this.version = normalized.version;
    this.nodes = new Map(
      Object.entries(normalized.nodes).map(([id, node]) => [id, cloneSceneNode(node)]),
    );
    this.nodeOrder = [...normalized.nodeOrder];
    this.layerOrder = [...normalized.layerOrder];

    this.invalidateSnapshotCache();

    return [...this.nodeOrder];
  }

  addNode(node: SceneNode, options?: { index?: number }): NodeId[] {
    this.writeNode(node);

    if (this.nodeOrder.includes(node.id)) {
      this.nodeOrder = this.nodeOrder.filter((existingId) => existingId !== node.id);
    }

    const index = options?.index;
    if (typeof index === "number" && Number.isFinite(index)) {
      const safeIndex = Math.max(0, Math.min(Math.floor(index), this.nodeOrder.length));
      this.nodeOrder.splice(safeIndex, 0, node.id);
    } else {
      this.nodeOrder.push(node.id);
    }

    this.ensureLayer(node.layerId);
    this.bumpVersion();
    this.invalidateSnapshotCache();

    return [node.id];
  }

  removeNode(nodeId: NodeId): NodeId[] {
    const existed = this.nodes.delete(nodeId);
    if (!existed) {
      return [];
    }

    this.nodeOrder = this.nodeOrder.filter((id) => id !== nodeId);
    this.bumpVersion();
    this.invalidateSnapshotCache();

    return [nodeId];
  }

  updateNode(nodeId: NodeId, updater: SceneNodeUpdater): NodeId[] {
    const prevNode = this.nodes.get(nodeId);
    if (!prevNode) {
      return [];
    }

    const nextNode =
      typeof updater === "function"
        ? updater(cloneSceneNode(prevNode))
        : {
            ...prevNode,
            ...updater,
            bounds: updater.bounds ?? prevNode.bounds,
            transform: updater.transform ?? prevNode.transform,
            style: updater.style ? { ...prevNode.style, ...updater.style } : prevNode.style,
            data: updater.data ? { ...(prevNode.data ?? {}), ...updater.data } : prevNode.data,
          };

    if (nextNode.id !== nodeId) {
      throw new Error("SceneModel.updateNode cannot change node id");
    }

    this.writeNode(nextNode);
    this.ensureLayer(nextNode.layerId);
    this.bumpVersion();
    this.invalidateSnapshotCache();

    return [nodeId];
  }

  batchUpdate(transaction: (ops: SceneBatchOperations) => void): NodeId[] {
    const dirtyNodeIds = new Set<NodeId>();

    const ops: SceneBatchOperations = {
      addNode: (node, options) => {
        this.writeNode(node);

        if (this.nodeOrder.includes(node.id)) {
          this.nodeOrder = this.nodeOrder.filter((id) => id !== node.id);
        }

        const index = options?.index;
        if (typeof index === "number" && Number.isFinite(index)) {
          const safeIndex = Math.max(0, Math.min(Math.floor(index), this.nodeOrder.length));
          this.nodeOrder.splice(safeIndex, 0, node.id);
        } else {
          this.nodeOrder.push(node.id);
        }

        this.ensureLayer(node.layerId);
        dirtyNodeIds.add(node.id);
      },
      removeNode: (nodeId) => {
        const existed = this.nodes.delete(nodeId);
        if (!existed) {
          return;
        }

        this.nodeOrder = this.nodeOrder.filter((id) => id !== nodeId);
        dirtyNodeIds.add(nodeId);
      },
      updateNode: (nodeId, updater) => {
        const prevNode = this.nodes.get(nodeId);
        if (!prevNode) {
          return;
        }

        const nextNode =
          typeof updater === "function"
            ? updater(cloneSceneNode(prevNode))
            : {
                ...prevNode,
                ...updater,
                bounds: updater.bounds ?? prevNode.bounds,
                transform: updater.transform ?? prevNode.transform,
                style: updater.style ? { ...prevNode.style, ...updater.style } : prevNode.style,
                data: updater.data ? { ...(prevNode.data ?? {}), ...updater.data } : prevNode.data,
              };

        if (nextNode.id !== nodeId) {
          throw new Error("SceneModel.batchUpdate.updateNode cannot change node id");
        }

        this.writeNode(nextNode);
        this.ensureLayer(nextNode.layerId);
        dirtyNodeIds.add(nodeId);
      },
    };

    transaction(ops);

    if (dirtyNodeIds.size > 0) {
      this.bumpVersion();
      this.invalidateSnapshotCache();
    }

    return [...dirtyNodeIds];
  }

  getSnapshot(): SceneModelSnapshot {
    return {
      version: this.version,
      nodes: new Map(this.nodes.entries()),
      nodeOrder: [...this.nodeOrder],
      layerOrder: [...this.layerOrder],
    };
  }

  getSerializableState(): SerializableSceneState {
    if (this.immutableSnapshotCache) {
      return this.immutableSnapshotCache;
    }

    const normalized = normalizeSerializableSceneState({
      version: this.version,
      nodes: Object.fromEntries(
        [...this.nodes.entries()].map(([id, node]) => [id, cloneSceneNode(node)]),
      ),
      nodeOrder: [...this.nodeOrder],
      layerOrder: [...this.layerOrder],
    });

    this.immutableSnapshotCache = freezeSceneState(normalized);
    return this.immutableSnapshotCache;
  }

  getNode(nodeId: NodeId): SceneNode | undefined {
    const node = this.nodes.get(nodeId);
    return node ? cloneSceneNode(node) : undefined;
  }

  private writeNode(node: SceneNode): void {
    this.nodes.set(node.id, cloneSceneNode(node));
  }

  private ensureLayer(layerId: LayerId): void {
    if (!this.layerOrder.includes(layerId)) {
      this.layerOrder.push(layerId);
    }
  }

  private bumpVersion(): void {
    this.version += 1;
  }

  private invalidateSnapshotCache(): void {
    this.immutableSnapshotCache = null;
  }
}

export function createSceneModel(initialState?: SerializableSceneState): SceneModel {
  return new SceneModel(initialState);
}

export function normalizeSerializableSceneState(sceneState: SerializableSceneState): SerializableSceneState {
  const nodesById: Record<NodeId, SceneNode> = {};
  for (const [id, node] of Object.entries(sceneState.nodes)) {
    nodesById[id] = cloneSceneNode(node);
  }

  const nodeIds = Object.keys(nodesById);
  const orderSet = new Set<NodeId>();

  const nodeOrder = sceneState.nodeOrder
    .filter((nodeId) => Boolean(nodesById[nodeId]))
    .filter((nodeId) => {
      if (orderSet.has(nodeId)) {
        return false;
      }

      orderSet.add(nodeId);
      return true;
    });

  for (const nodeId of nodeIds) {
    if (!orderSet.has(nodeId)) {
      orderSet.add(nodeId);
      nodeOrder.push(nodeId);
    }
  }

  const layerSet = new Set<LayerId>([DEFAULT_LAYER_ID]);
  for (const layerId of sceneState.layerOrder) {
    layerSet.add(layerId);
  }
  for (const node of Object.values(nodesById)) {
    layerSet.add(node.layerId);
  }

  const layerOrder = [...layerSet];

  return {
    version: Math.max(1, sceneState.version || 1),
    nodes: nodesById,
    nodeOrder,
    layerOrder,
  };
}

export function createImmutableSceneSnapshot(sceneState: SerializableSceneState): SerializableSceneState {
  return freezeSceneState(normalizeSerializableSceneState(sceneState));
}

function createEmptyNormalizedSceneState(): SerializableSceneState {
  return {
    version: 1,
    nodes: {},
    nodeOrder: [],
    layerOrder: [DEFAULT_LAYER_ID],
  };
}

function cloneSceneNode(node: SceneNode): SceneNode {
  return {
    ...node,
    bounds: { ...node.bounds },
    transform: {
      translate: { ...node.transform.translate },
      scale: { ...node.transform.scale },
      rotate: node.transform.rotate,
    },
    style: { ...node.style },
    data: node.data ? { ...node.data } : undefined,
  };
}

function freezeSceneState(sceneState: SerializableSceneState): SerializableSceneState {
  Object.freeze(sceneState.layerOrder);
  Object.freeze(sceneState.nodeOrder);

  for (const node of Object.values(sceneState.nodes)) {
    if (node.data?.points) {
      Object.freeze(node.data.points);
    }

    Object.freeze(node.data ?? {});
    Object.freeze(node.style);
    Object.freeze(node.transform.translate);
    Object.freeze(node.transform.scale);
    Object.freeze(node.transform);
    Object.freeze(node.bounds);
    Object.freeze(node);
  }

  Object.freeze(sceneState.nodes);
  return Object.freeze(sceneState);
}
