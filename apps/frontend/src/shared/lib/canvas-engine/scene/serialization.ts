import { createEmptySerializableSceneState, type SerializableSceneState } from "./scene-state";
import { normalizeSerializableSceneState } from "./scene-model";

export const SCENE_FORMAT_VERSION = 1;

export type DeserializeResult =
  | { ok: true; scene: SerializableSceneState; warnings: string[] }
  | { ok: false; scene: SerializableSceneState; warnings: string[]; error: string };

export function serializeSceneToJson(scene: SerializableSceneState): string {
  // Always serialize normalized snapshot for determinism.
  const normalized = normalizeSerializableSceneState(scene);
  return JSON.stringify(normalized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrateToLatest(
  input: SerializableSceneState,
  versionWasMissing: boolean,
): { scene: SerializableSceneState; warnings: string[] } {
  const warnings: string[] = [];

  let scene = input;
  if (versionWasMissing || scene.version < 1) {
    warnings.push("Scene version was missing/invalid; defaulted to v1.");
    scene = { ...scene, version: 1 };
  }

  // Future migrations can go here:
  // if (scene.version === 1) { ...; scene = { ...scene, version: 2 }; }

  scene = { ...scene, version: SCENE_FORMAT_VERSION };
  return { scene, warnings };
}

export function deserializeSceneFromJson(json: string): DeserializeResult {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) {
      return {
        ok: false,
        scene: createEmptySerializableSceneState(),
        warnings: [],
        error: "Scene JSON must be an object",
      };
    }

    const raw = parsed as Partial<SerializableSceneState>;
    const versionWasMissing = typeof raw.version !== "number" || raw.version < 1;
    const candidate: SerializableSceneState = {
      version: versionWasMissing ? 1 : typeof raw.version === "number" ? raw.version : 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes: isRecord(raw.nodes) ? (raw.nodes as any) : {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodeOrder: Array.isArray(raw.nodeOrder) ? (raw.nodeOrder as any) : [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      layerOrder: Array.isArray(raw.layerOrder) ? (raw.layerOrder as any) : [],
    };

    const migrated = migrateToLatest(candidate, versionWasMissing);
    const normalized = normalizeSerializableSceneState(migrated.scene);

    return { ok: true, scene: normalized, warnings: migrated.warnings };
  } catch (error) {
    return {
      ok: false,
      scene: createEmptySerializableSceneState(),
      warnings: [],
      error: error instanceof Error ? error.message : "Failed to parse scene JSON",
    };
  }
}

