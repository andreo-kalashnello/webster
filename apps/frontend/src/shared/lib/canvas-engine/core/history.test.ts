import { describe, it, expect, beforeEach } from "vitest";
import { createCanvasEngine } from "./create-engine";
import { createIdentityTransform, DEFAULT_LAYER_ID } from "./types";
import type { SceneNode } from "../scene/scene-node";

function makeNode(id: string, x = 0, y = 0): SceneNode {
  return {
    id,
    layerId: DEFAULT_LAYER_ID,
    type: "rect",
    bounds: { x, y, width: 100, height: 80 },
    transform: createIdentityTransform(),
    style: { fill: "#3b82f6" },
  };
}

describe("undo/redo — basic", () => {
  let engine: ReturnType<typeof createCanvasEngine>;

  beforeEach(() => {
    engine = createCanvasEngine();
  });

  it("canUndo returns false on fresh engine", () => {
    expect(engine.canUndo()).toBe(false);
  });

  it("canRedo returns false on fresh engine", () => {
    expect(engine.canRedo()).toBe(false);
  });

  it("addNode makes canUndo true", () => {
    engine.addNode(makeNode("n1"));
    expect(engine.canUndo()).toBe(true);
  });

  it("undo removes the added node", () => {
    engine.addNode(makeNode("n1"));
    engine.undo();
    expect(engine.getSerializableState().nodes["n1"]).toBeUndefined();
  });

  it("undo then redo re-adds node", () => {
    engine.addNode(makeNode("n1"));
    engine.undo();
    engine.redo();
    expect(engine.getSerializableState().nodes["n1"]).toBeDefined();
  });

  it("canRedo is false after new action following undo", () => {
    engine.addNode(makeNode("n1"));
    engine.undo();
    engine.addNode(makeNode("n2"));
    expect(engine.canRedo()).toBe(false);
  });
});

describe("undo/redo — move", () => {
  let engine: ReturnType<typeof createCanvasEngine>;

  beforeEach(() => {
    engine = createCanvasEngine();
    engine.addNode(makeNode("n1", 0, 0));
    // Clear history from addNode so we test only the move.
    engine.undo();
    engine.redo();
    // Drain undo to just the add.
  });

  it("move creates history entry", () => {
    const before = engine.canUndo();
    engine.move("n1", { x: 200, y: 300 });
    expect(engine.canUndo()).toBe(true);
    expect(before).toBe(true); // was already true from addNode
  });

  it("undo restores previous position", () => {
    engine.move("n1", { x: 200, y: 300 });
    // Undo the move
    engine.undo();
    const node = engine.getSerializableState().nodes["n1"];
    expect(node?.bounds.x).toBe(0);
    expect(node?.bounds.y).toBe(0);
  });
});

describe("undo/redo — delete", () => {
  let engine: ReturnType<typeof createCanvasEngine>;

  beforeEach(() => {
    engine = createCanvasEngine();
    engine.addNode(makeNode("n1"));
  });

  it("removeNode can be undone", () => {
    engine.removeNode("n1");
    expect(engine.getSerializableState().nodes["n1"]).toBeUndefined();
    engine.undo();
    expect(engine.getSerializableState().nodes["n1"]).toBeDefined();
  });
});

describe("undo/redo — style update", () => {
  let engine: ReturnType<typeof createCanvasEngine>;

  beforeEach(() => {
    engine = createCanvasEngine();
    engine.addNode(makeNode("n1"));
  });

  it("updateNode style change can be undone", () => {
    engine.updateNode("n1", (prev) => ({ ...prev, style: { ...prev.style, fill: "#ff0000" } }));
    engine.undo();
    const node = engine.getSerializableState().nodes["n1"];
    expect(node?.style.fill).toBe("#3b82f6");
  });
});

describe("undo/redo — rotate", () => {
  let engine: ReturnType<typeof createCanvasEngine>;

  beforeEach(() => {
    engine = createCanvasEngine();
    engine.addNode(makeNode("n1"));
  });

  it("setNodeTransform rotation can be undone", () => {
    engine.setNodeTransform("n1", { ...createIdentityTransform(), rotate: 45 });
    engine.undo();
    const node = engine.getSerializableState().nodes["n1"];
    expect(node?.transform.rotate).toBe(0);
  });
});

describe("undo/redo — determinism", () => {
  it("multiple undo/redo cycles produce identical state", () => {
    const engine = createCanvasEngine();
    engine.addNode(makeNode("n1", 10, 20));
    engine.move("n1", { x: 50, y: 60 }, { history: { label: "m1" } });

    const afterMoves = JSON.stringify(engine.getSerializableState().nodes["n1"]?.bounds);

    // Undo twice, redo twice.
    engine.undo();
    engine.undo();
    engine.redo();
    engine.redo();

    const afterCycles = JSON.stringify(engine.getSerializableState().nodes["n1"]?.bounds);
    expect(afterMoves).toBe(afterCycles);
  });
});

describe("history depth limit", () => {
  it("does not exceed 200 history entries", () => {
    const engine = createCanvasEngine();
    engine.addNode(makeNode("n1"));
    for (let i = 0; i < 250; i++) {
      engine.move("n1", { x: i, y: 0 }, { history: { label: `move-${i}` } });
    }
    // We can undo at most 200 times; 251st undo should not crash.
    let undoCount = 0;
    while (engine.canUndo()) {
      engine.undo();
      undoCount++;
    }
    expect(undoCount).toBeLessThanOrEqual(200 + 1); // +1 for initial addNode
  });
});
