import { DEFAULT_LAYER_ID, createIdentityTransform } from "../core/types";
import type { SerializableSceneState } from "../scene/scene-state";
import type { SceneNode, SceneNodeType } from "../scene/scene-node";
import { createEmptySerializableSceneState } from "../scene/scene-state";

const SHAPES: SceneNodeType[] = ["rect", "triangle", "arrow", "text"];
const FILL_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#a855f7", "#ef4444", "#eab308"];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createStressScene(nodeCount: number): SerializableSceneState {
  const base = createEmptySerializableSceneState();
  const nodes: Record<string, SceneNode> = {};
  const nodeOrder: string[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const id = `stress-node-${i}`;
    const type = randomItem(SHAPES);
    const x = randomBetween(0, 2400);
    const y = randomBetween(0, 1600);
    const w = randomBetween(40, 180);
    const h = randomBetween(30, 120);
    const fill = randomItem(FILL_COLORS);

    const node: SceneNode = {
      id,
      layerId: DEFAULT_LAYER_ID,
      type,
      bounds: { x, y, width: w, height: h },
      transform: createIdentityTransform(),
      style: { fill, stroke: "#1e293b", strokeWidth: 1, opacity: 0.88 },
      data: type === "text" ? { text: `Node ${i}` } : undefined,
    };

    nodes[id] = node;
    nodeOrder.push(id);
  }

  return { ...base, nodes, nodeOrder };
}
