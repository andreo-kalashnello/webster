import { describe, it, expect } from "vitest";
import { hitTestNodeAtWorldPoint, pickTopMostNodeAtWorldPoint, getSelectionWorldBounds } from "./hit-test";
import { createIdentityTransform } from "../core/types";
import type { SceneNode } from "../scene/scene-node";

function makeNode(overrides: Partial<SceneNode> & { id: string; type: SceneNode["type"] }): SceneNode {
  return {
    layerId: "layer-default",
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    transform: createIdentityTransform(),
    style: {},
    ...overrides,
  };
}

describe("hitTestNodeAtWorldPoint — rect", () => {
  const node = makeNode({ id: "r1", type: "rect", bounds: { x: 10, y: 10, width: 80, height: 60 } });

  it("hits center", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 50, y: 40 })).toBe(true);
  });

  it("misses outside (right)", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 200, y: 40 })).toBe(false);
  });

  it("hits edge (left boundary)", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 10, y: 40 })).toBe(true);
  });

  it("misses just outside (left)", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 9, y: 40 })).toBe(false);
  });
});

describe("hitTestNodeAtWorldPoint — triangle", () => {
  // Triangle vertices: top-center, bottom-right, bottom-left.
  // bounds: x=0, y=0, w=100, h=100
  // A=(50,0), B=(100,100), C=(0,100)
  const node = makeNode({ id: "t1", type: "triangle", bounds: { x: 0, y: 0, width: 100, height: 100 } });

  it("hits center of triangle body", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 50, y: 80 })).toBe(true);
  });

  it("misses top-left corner (outside triangle but inside AABB)", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 5, y: 5 })).toBe(false);
  });

  it("misses top-right corner", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 95, y: 5 })).toBe(false);
  });

  it("hits apex (top-center)", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 50, y: 0 })).toBe(true);
  });
});

describe("hitTestNodeAtWorldPoint — rotated rect", () => {
  // 45° rotated 100×10 rect centered at (50, 50).
  const node = makeNode({
    id: "rr1",
    type: "rect",
    bounds: { x: 0, y: 45, width: 100, height: 10 },
    transform: { ...createIdentityTransform(), rotate: 45 },
  });

  it("hits center (rotation-agnostic: local (50,50) → world center)", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 50, y: 50 })).toBe(true);
  });

  it("misses far corner that was inside AABB before rotation", () => {
    // Point at (90, 55) — inside AABB of bounds but not inside the rotated rect.
    expect(hitTestNodeAtWorldPoint(node, { x: 90, y: 55 })).toBe(false);
  });
});

describe("hitTestNodeAtWorldPoint — arrow/path", () => {
  const node = makeNode({
    id: "a1",
    type: "arrow",
    bounds: { x: 0, y: 45, width: 100, height: 10 },
    style: { strokeWidth: 4 },
    data: { points: [{ x: 0, y: 50 }, { x: 100, y: 50 }] },
  });

  it("hits close to line", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 50, y: 52 })).toBe(true);
  });

  it("misses far from line", () => {
    expect(hitTestNodeAtWorldPoint(node, { x: 50, y: 80 })).toBe(false);
  });
});

describe("pickTopMostNodeAtWorldPoint", () => {
  const r1 = makeNode({ id: "r1", type: "rect", bounds: { x: 0, y: 0, width: 100, height: 100 } });
  const r2 = makeNode({ id: "r2", type: "rect", bounds: { x: 20, y: 20, width: 60, height: 60 } });
  const scene = { nodeOrder: ["r1", "r2"], nodes: { r1, r2 } };

  it("returns top-most (last in z-order) when overlapping", () => {
    expect(pickTopMostNodeAtWorldPoint(scene, { x: 50, y: 50 })).toBe("r2");
  });

  it("returns lower node when upper is not at point", () => {
    expect(pickTopMostNodeAtWorldPoint(scene, { x: 5, y: 5 })).toBe("r1");
  });

  it("returns null when no node at point", () => {
    expect(pickTopMostNodeAtWorldPoint(scene, { x: 200, y: 200 })).toBeNull();
  });
});

describe("getSelectionWorldBounds", () => {
  const r1 = makeNode({ id: "r1", type: "rect", bounds: { x: 0, y: 0, width: 40, height: 30 } });
  const r2 = makeNode({ id: "r2", type: "rect", bounds: { x: 60, y: 50, width: 20, height: 10 } });
  const scene = { nodes: { r1, r2 } };

  it("returns union of two rects", () => {
    const b = getSelectionWorldBounds(scene, ["r1", "r2"]);
    expect(b).not.toBeNull();
    expect(b!.x).toBe(0);
    expect(b!.y).toBe(0);
    expect(b!.width).toBe(80);  // 60 + 20
    expect(b!.height).toBe(60); // 50 + 10
  });

  it("returns null for empty selection", () => {
    expect(getSelectionWorldBounds(scene, [])).toBeNull();
  });
});
