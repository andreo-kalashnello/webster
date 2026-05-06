import { describe, it, expect } from "vitest";
import { serializeSceneToJson, deserializeSceneFromJson, SCENE_FORMAT_VERSION } from "./serialization";
import { createEmptySerializableSceneState } from "./scene-state";
import { createIdentityTransform, DEFAULT_LAYER_ID } from "../core/types";
import type { SerializableSceneState } from "./scene-state";
import type { SceneNode } from "./scene-node";

function makeScene(): SerializableSceneState {
  const node: SceneNode = {
    id: "n1",
    layerId: DEFAULT_LAYER_ID,
    type: "rect",
    bounds: { x: 10, y: 20, width: 80, height: 60 },
    transform: createIdentityTransform(),
    style: { fill: "#aabbcc" },
  };
  return {
    version: 1,
    nodes: { n1: node },
    nodeOrder: ["n1"],
    layerOrder: [DEFAULT_LAYER_ID],
  };
}

describe("serializeSceneToJson", () => {
  it("returns valid JSON string", () => {
    const json = serializeSceneToJson(createEmptySerializableSceneState());
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("includes version field", () => {
    const json = serializeSceneToJson(createEmptySerializableSceneState());
    const parsed = JSON.parse(json);
    expect(typeof parsed.version).toBe("number");
  });

  it("includes nodes", () => {
    const json = serializeSceneToJson(makeScene());
    const parsed = JSON.parse(json);
    expect(parsed.nodes.n1).toBeDefined();
    expect(parsed.nodes.n1.style.fill).toBe("#aabbcc");
  });
});

describe("deserializeSceneFromJson — happy path", () => {
  it("round-trips scene through serialize → deserialize", () => {
    const original = makeScene();
    const json = serializeSceneToJson(original);
    const result = deserializeSceneFromJson(json);

    expect(result.ok).toBe(true);
    expect(result.scene.nodes["n1"]).toBeDefined();
    expect(result.scene.nodes["n1"]?.style.fill).toBe("#aabbcc");
    expect(result.scene.nodeOrder).toContain("n1");
  });

  it("sets version to SCENE_FORMAT_VERSION", () => {
    const json = serializeSceneToJson(makeScene());
    const result = deserializeSceneFromJson(json);
    expect(result.scene.version).toBe(SCENE_FORMAT_VERSION);
  });

  it("returns no warnings for valid scene", () => {
    const json = serializeSceneToJson(makeScene());
    const result = deserializeSceneFromJson(json);
    expect(result.ok && result.warnings.length === 0).toBe(true);
  });
});

describe("deserializeSceneFromJson — validation & fallback", () => {
  it("returns ok:false for totally invalid JSON", () => {
    const result = deserializeSceneFromJson("{bad json!!!");
    expect(result.ok).toBe(false);
    expect("error" in result && result.error.length > 0).toBe(true);
  });

  it("falls back to empty scene on invalid JSON", () => {
    const result = deserializeSceneFromJson("null");
    expect(result.ok).toBe(false);
    expect(result.scene).toEqual(createEmptySerializableSceneState());
  });

  it("handles missing nodes gracefully", () => {
    const result = deserializeSceneFromJson('{"version":1}');
    expect(result.ok).toBe(true);
    expect(result.scene.nodeOrder).toEqual([]);
  });

  it("ignores nodeOrder entries with no matching node", () => {
    const json = JSON.stringify({ version: 1, nodes: {}, nodeOrder: ["ghost"], layerOrder: [] });
    const result = deserializeSceneFromJson(json);
    expect(result.ok).toBe(true);
    expect(result.scene.nodeOrder).not.toContain("ghost");
  });

  it("adds warning for missing version", () => {
    const json = JSON.stringify({ nodes: {}, nodeOrder: [], layerOrder: [] });
    const result = deserializeSceneFromJson(json);
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
