import type { NodeId, ToolName } from "./types";

export type SceneChangeReason = "init" | "replace-scene" | "node-update";

export type EngineEventMap = {
  "engine:ready": { timestamp: string };
  "scene:changed": { reason: SceneChangeReason };
  "selection:changed": { selectedNodeIds: NodeId[] };
  "tool:changed": { tool: ToolName };
};

type EngineEventName = keyof EngineEventMap;
type EngineEventListener<K extends EngineEventName> = (payload: EngineEventMap[K]) => void;

export class EngineEventBus {
  private listeners = new Map<EngineEventName, Set<(payload: unknown) => void>>();

  on<K extends EngineEventName>(eventName: K, listener: EngineEventListener<K>): () => void {
    const eventListeners = this.listeners.get(eventName) ?? new Set<(payload: unknown) => void>();
    eventListeners.add(listener as (payload: unknown) => void);
    this.listeners.set(eventName, eventListeners);

    return () => {
      eventListeners.delete(listener as (payload: unknown) => void);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    };
  }

  emit<K extends EngineEventName>(eventName: K, payload: EngineEventMap[K]): void {
    const eventListeners = this.listeners.get(eventName);
    if (!eventListeners) {
      return;
    }

    eventListeners.forEach((listener) => {
      (listener as EngineEventListener<K>)(payload);
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}