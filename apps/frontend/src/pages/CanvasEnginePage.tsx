import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  ENGINE_TOOLS,
  createCanvasEngine,
  createEmptySerializableSceneState,
  createNodeId,
  type ToolName,
} from "@/shared/lib/canvas-engine";

type EngineDebugState = {
  activeTool: ToolName;
  selectedCount: number;
  sceneVersion: number;
  lastEvent: string;
};

export function CanvasEnginePage() {
  const engine = useMemo(() => createCanvasEngine(), []);

  const [debug, setDebug] = useState<EngineDebugState>(() => {
    const runtime = engine.getRuntimeSnapshot();

    return {
      activeTool: runtime.activeTool,
      selectedCount: runtime.selectedNodeIds.length,
      sceneVersion: engine.getSerializableState().version,
      lastEvent: "scene:changed:init",
    };
  });

  useEffect(() => {
    const stopTool = engine.events.on("tool:changed", ({ tool }) => {
      setDebug((prev) => ({
        ...prev,
        activeTool: tool,
        lastEvent: `tool:changed:${tool}`,
      }));
    });

    const stopSelection = engine.events.on("selection:changed", ({ selectedNodeIds }) => {
      setDebug((prev) => ({
        ...prev,
        selectedCount: selectedNodeIds.length,
        lastEvent: `selection:changed:${selectedNodeIds.length}`,
      }));
    });

    const stopScene = engine.events.on("scene:changed", ({ reason }) => {
      setDebug((prev) => ({
        ...prev,
        sceneVersion: engine.getSerializableState().version,
        lastEvent: `scene:changed:${reason}`,
      }));
    });

    return () => {
      stopTool();
      stopSelection();
      stopScene();
    };
  }, [engine]);

  function handleCycleTool(): void {
    const toolIds = ENGINE_TOOLS.map((tool) => tool.id);
    const currentIndex = toolIds.indexOf(debug.activeTool);
    const nextTool = toolIds[(currentIndex + 1) % toolIds.length] ?? "select";

    engine.setTool(nextTool);
  }

  function handleSelectionSmoke(): void {
    engine.setSelection([createNodeId("smoke")]);
  }

  function handleClearSelection(): void {
    engine.setSelection([]);
  }

  function handleReplaceScene(): void {
    const nextVersion = engine.getSerializableState().version + 1;
    engine.replaceScene({
      ...createEmptySerializableSceneState(),
      version: nextVersion,
    });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#e0f2fe,#f8fafc_60%)] p-6 font-sans">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-slate-500">Canvas Engine</p>
          <h1 className="mb-2 text-3xl font-semibold tracking-tight text-slate-900">Test Page</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Здесь ты проверяешь базовые операции движка: добавление объектов, выделение,
            перемещение, resize, rotate, undo/redo и сохранение состояния.
          </p>
        </div>

        <Link
          className="inline-flex w-fit items-center rounded-xl border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:text-blue-800"
          to="/"
        >
          Назад к статусу
        </Link>
      </header>

      <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-sky-100 bg-white/95 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Тестовые действия</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-7 text-slate-700">
            <li>Проверить смену инструмента</li>
            <li>Проверить selection event</li>
            <li>Проверить reset/replace scene</li>
            <li>Проверить runtime и serializable state</li>
            <li>Проверить событие последнего действия</li>
          </ul>

          <div className="mt-5 rounded-xl border border-sky-100 bg-linear-to-b from-slate-50 to-slate-100 p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Smoke test шага 1</h3>
            <p className="mb-3 text-xs text-slate-600">
              Доступные tools: {ENGINE_TOOLS.map((tool) => tool.id).join(", ")}
            </p>

            <div className="mb-3 grid gap-2">
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                <span>activeTool</span>
                <strong className="font-semibold text-slate-900">{debug.activeTool}</strong>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                <span>selectedCount</span>
                <strong className="font-semibold text-slate-900">{debug.selectedCount}</strong>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                <span>sceneVersion</span>
                <strong className="font-semibold text-slate-900">{debug.sceneVersion}</strong>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                <span>lastEvent</span>
                <strong className="font-semibold text-slate-900">{debug.lastEvent}</strong>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:border-sky-400 hover:text-blue-700"
                type="button"
                onClick={handleCycleTool}
              >
                Сменить tool
              </button>
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:border-sky-400 hover:text-blue-700"
                type="button"
                onClick={handleSelectionSmoke}
              >
                Smoke selection
              </button>
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:border-sky-400 hover:text-blue-700"
                type="button"
                onClick={handleClearSelection}
              >
                Очистить selection
              </button>
              <button
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 transition-colors hover:border-sky-400 hover:text-blue-700"
                type="button"
                onClick={handleReplaceScene}
              >
                Replace scene
              </button>
            </div>
          </div>
        </aside>

        <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white/95 shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-linear-to-r from-blue-50 to-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
            <span>Canvas preview</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">/canvas-engine</span>
          </div>
          <div className="relative min-h-130 bg-[linear-gradient(rgba(255,255,255,0.6),rgba(255,255,255,0.6)),radial-gradient(circle_at_20%_20%,#dbeafe_0,transparent_30%),radial-gradient(circle_at_80%_30%,#bae6fd_0,transparent_22%),#f8fafc]">
            <div className="absolute left-25 top-20 h-30 w-45 -rotate-8 rounded-[18px] bg-linear-to-br from-blue-700 to-sky-400 shadow-[0_18px_35px_rgba(29,78,216,0.28)]" />
            <div className="absolute left-75 top-65 h-35 w-35 rotate-14 rounded-[18px] bg-linear-to-br from-orange-500 to-rose-400 shadow-[0_18px_35px_rgba(249,115,22,0.28)]" />
            <p className="absolute bottom-5 left-6 m-0 text-sm text-slate-600">
              Здесь позже будет сам тестовый canvas и твои инструменты.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}