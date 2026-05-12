import {
  createEmptySerializableSceneState,
  deserializeSceneFromJson,
  type SerializableSceneState,
} from "@/shared/lib/canvas-engine";

/** Maps `Project.content` from API (object or JSON string) to engine scene state. */
export function sceneStateFromProjectContent(content: unknown): SerializableSceneState {
  if (content == null) {
    return createEmptySerializableSceneState();
  }
  try {
    if (typeof content === "string") {
      const r = deserializeSceneFromJson(content);
      return r.ok ? r.scene : createEmptySerializableSceneState();
    }
    if (typeof content === "object") {
      const r = deserializeSceneFromJson(JSON.stringify(content));
      return r.ok ? r.scene : createEmptySerializableSceneState();
    }
  } catch {
    // ignore
  }
  return createEmptySerializableSceneState();
}
