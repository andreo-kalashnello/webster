import { ArrowRight, Image, MousePointer2, Pencil, Square, Triangle, Type } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_LAYER_ID,
  ENGINE_TOOLS,
  CanvasRenderer,
  createIdentityTransform,
  createCanvasEngine,
  createEmptySerializableSceneState,
  type RenderMode,
  type NodeId,
  type Point,
  type SceneNode,
  type SerializableSceneState,
  type ToolName,
} from "@/shared/lib/canvas-engine";

const ZOOM_SENSITIVITY = 0.0015;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

type CanvasToolUiItem = {
  id: ToolName;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const TOOLBAR_TOOLS: CanvasToolUiItem[] = [
  { id: "select", label: "Select", hint: "V", Icon: MousePointer2 },
  { id: "pencil", label: "Pencil", hint: "P", Icon: Pencil },
  { id: "text", label: "Text", hint: "T", Icon: Type },
  { id: "rect", label: "Rect", hint: "R", Icon: Square },
  { id: "triangle", label: "Triangle", hint: "G", Icon: Triangle },
  { id: "arrow", label: "Arrow", hint: "A", Icon: ArrowRight },
  { id: "image", label: "Image", hint: "I", Icon: Image },
];

type DragState =
  | {
      mode: "node";
      pointerId: number;
      nodeId: NodeId;
      startWorld: Point;
      initialX: number;
      initialY: number;
      originalPoints?: Point[];
    }
  | {
      mode: "pan";
      pointerId: number;
      startClient: Point;
      initialCameraX: number;
      initialCameraY: number;
    }
  | {
      mode: "pencil";
      pointerId: number;
      nodeId: NodeId;
      points: Point[];
    }
  | {
      mode: "arrow";
      pointerId: number;
      nodeId: NodeId;
      startPoint: Point;
      endPoint: Point;
    }
  | {
      mode: "shape";
      pointerId: number;
      nodeId: NodeId;
      tool: "rect" | "triangle" | "image";
      startPoint: Point;
      endPoint: Point;
    };

type EngineDebugState = {
  activeTool: ToolName;
  selectedCount: number;
  sceneVersion: number;
  lastEvent: string;
  renderMode: RenderMode;
  frameTimeMs: number;
  renderedNodes: number;
  dpr: number;
  nodeCount: number;
  layerCount: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
};

export function CanvasEnginePage() {
  const engine = useMemo(() => createCanvasEngine(), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasInteractionActiveRef = useRef(false);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const [debug, setDebug] = useState<EngineDebugState>(() => {
    const runtime = engine.getRuntimeSnapshot();

    return {
      ...getSceneCounters(engine),
      activeTool: runtime.activeTool,
      selectedCount: runtime.selectedNodeIds.length,
      sceneVersion: engine.getSerializableState().version,
      lastEvent: "scene:changed:init",
      renderMode: "full-redraw",
      frameTimeMs: 0,
      renderedNodes: 0,
      dpr: typeof window !== "undefined" ? Math.max(window.devicePixelRatio || 1, 1) : 1,
      cameraX: 0,
      cameraY: 0,
      cameraZoom: 1,
    };
  });

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    // Demo scene is used as a stable smoke-test for renderer lifecycle.
    engine.replaceScene(createRendererDemoScene());
    engine.setSelection(["node-rect"]);

    const renderer = new CanvasRenderer({
      canvas: canvasRef.current,
      engine,
      background: "transparent",
    });
    rendererRef.current = renderer;

    renderer.mount();

    const tick = window.setInterval(() => {
      const stats = renderer.getStats();
      const viewport = renderer.getViewport();

      setDebug((prev) => ({
        ...prev,
        renderMode: stats.mode,
        frameTimeMs: stats.frameTimeMs,
        renderedNodes: stats.renderedNodes,
        dpr: viewport.dpr,
        cameraX: renderer.getCamera().x,
        cameraY: renderer.getCamera().y,
        cameraZoom: renderer.getCamera().zoom,
      }));
    }, 200);

    return () => {
      window.clearInterval(tick);
      renderer.destroy();
      rendererRef.current = null;
    };
  }, [engine]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const handleNativeWheel = (event: WheelEvent): void => {
      event.preventDefault();
      handleCanvasWheel(event, canvas);
    };

    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleNativeWheel);
    };
  }, [engine]);

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
      const counters = getSceneCounters(engine);

      setDebug((prev) => ({
        ...prev,
        ...counters,
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

  function handleReplaceScene(): void {
    const currentVersion = engine.getSerializableState().version;
    const nextScene = createRendererDemoScene(currentVersion + 1);

    engine.replaceScene(nextScene);
    engine.setSelection(["node-triangle"]);

    const renderer = rendererRef.current;
    if (renderer) {
      renderer.setCamera({ x: 0, y: 0, zoom: 1 });
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (!canvasInteractionActiveRef.current) {
        return;
      }

      const runtime = engine.getRuntimeSnapshot();
      const selectedNodeIds = runtime.selectedNodeIds;
      const hasSelection = selectedNodeIds.length > 0;
      const hasModifier = event.metaKey || event.ctrlKey;

      if ((event.key === "Delete" || event.key === "Backspace") && hasSelection) {
        event.preventDefault();
        engine.batchUpdate(({ removeNode }) => {
          for (const nodeId of selectedNodeIds) {
            removeNode(nodeId);
          }
        });
        engine.setSelection([]);
        return;
      }

      if ((hasModifier && event.shiftKey && event.key.toLowerCase() === "d") && hasSelection) {
        event.preventDefault();
        duplicateSelection(engine, selectedNodeIds);

        return;
      }

      if (!hasModifier && !event.shiftKey && event.key.toLowerCase() === "d" && hasSelection) {
        event.preventDefault();
        duplicateSelection(engine, selectedNodeIds);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        engine.setSelection([]);
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        if (debug.activeTool === "select") {
          handleReplaceScene();
        }
        return;
      }

      const toolIndex = Number(event.key);
      if (Number.isInteger(toolIndex) && toolIndex >= 1 && toolIndex <= ENGINE_TOOLS.length) {
        event.preventDefault();
        const nextTool = ENGINE_TOOLS[toolIndex - 1]?.id;
        if (nextTool) {
          engine.setTool(nextTool);
        }
        return;
      }

      const arrowMove =
        event.key === "ArrowUp"
          ? { x: 0, y: -8 }
          : event.key === "ArrowDown"
            ? { x: 0, y: 8 }
            : event.key === "ArrowLeft"
              ? { x: -8, y: 0 }
              : event.key === "ArrowRight"
                ? { x: 8, y: 0 }
                : null;

      if (arrowMove && hasSelection) {
        event.preventDefault();
        engine.batchUpdate(({ updateNode }) => {
          for (const nodeId of selectedNodeIds) {
            updateNode(nodeId, (prevNode) => ({
              ...prevNode,
              bounds: {
                ...prevNode.bounds,
                x: prevNode.bounds.x + arrowMove.x,
                y: prevNode.bounds.y + arrowMove.y,
              },
            }));
          }
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [debug.activeTool, engine]);

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (event.button !== 0) {
      return;
    }

    canvasInteractionActiveRef.current = true;
    event.currentTarget.focus();

    const point = getCanvasPoint(event);
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }

    const worldPoint = renderer.screenToWorld(point);
    const scene = engine.getSerializableState();
    const activeTool = engine.getRuntimeSnapshot().activeTool;

    if (activeTool === "text") {
      const textValue = window.prompt("Введи текст", "Новый текст");
      if (!textValue || textValue.trim().length === 0) {
        return;
      }

      const textNodeId = `text-${Date.now()}`;
      engine.addNode({
        id: textNodeId,
        layerId: DEFAULT_LAYER_ID,
        type: "text",
        bounds: { x: worldPoint.x, y: worldPoint.y, width: Math.max(120, textValue.length * 10), height: 28 },
        transform: createIdentityTransform(),
        style: { fill: "#0f172a" },
        data: { text: textValue },
      });
      engine.setSelection([textNodeId]);
      return;
    }

    if (activeTool === "pencil") {
      const pathNodeId = `path-${Date.now()}`;
      const startBounds = buildPathBounds([worldPoint]);

      engine.addNode({
        id: pathNodeId,
        layerId: DEFAULT_LAYER_ID,
        type: "path",
        bounds: startBounds,
        transform: createIdentityTransform(),
        style: {
          stroke: "#0f172a",
          strokeWidth: 2,
          opacity: 1,
        },
        data: {
          points: [worldPoint],
        },
      });

      dragStateRef.current = {
        mode: "pencil",
        pointerId: event.pointerId,
        nodeId: pathNodeId,
        points: [worldPoint],
      };

      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "arrow") {
      const arrowNodeId = `arrow-${Date.now()}`;
      const initialBounds = buildLineBounds(worldPoint, worldPoint);

      engine.addNode({
        id: arrowNodeId,
        layerId: DEFAULT_LAYER_ID,
        type: "arrow",
        bounds: initialBounds,
        transform: createIdentityTransform(),
        style: {
          fill: "#0f172a",
          stroke: "#0f172a",
          strokeWidth: 2,
          opacity: 1,
        },
        data: {
          points: [worldPoint, worldPoint],
        },
      });

      dragStateRef.current = {
        mode: "arrow",
        pointerId: event.pointerId,
        nodeId: arrowNodeId,
        startPoint: worldPoint,
        endPoint: worldPoint,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool === "rect" || activeTool === "triangle" || activeTool === "image") {
      const shapeNodeId = `${activeTool}-${Date.now()}`;

      engine.addNode({
        id: shapeNodeId,
        layerId: DEFAULT_LAYER_ID,
        type: activeTool,
        bounds: buildRectBounds(worldPoint, worldPoint),
        transform: createIdentityTransform(),
        style: {
          fill: activeTool === "image" ? "#d1d5db" : "#60a5fa",
          stroke: "#1e293b",
          strokeWidth: 2,
          opacity: 0.92,
        },
      });

      dragStateRef.current = {
        mode: "shape",
        pointerId: event.pointerId,
        nodeId: shapeNodeId,
        tool: activeTool,
        startPoint: worldPoint,
        endPoint: worldPoint,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    if (activeTool !== "select") {
      return;
    }

    const hitNodeId = pickTopNodeAtPoint(scene, worldPoint);

    if (!hitNodeId) {
      engine.setSelection([]);
      const camera = renderer.getCamera();
      dragStateRef.current = {
        mode: "pan",
        pointerId: event.pointerId,
        startClient: { x: event.clientX, y: event.clientY },
        initialCameraX: camera.x,
        initialCameraY: camera.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    engine.setSelection([hitNodeId]);

    const hitNode = scene.nodes[hitNodeId];
    if (!hitNode) {
      return;
    }

    dragStateRef.current = {
      mode: "node",
      pointerId: event.pointerId,
      nodeId: hitNodeId,
      startWorld: worldPoint,
      initialX: hitNode.bounds.x,
      initialY: hitNode.bounds.y,
      originalPoints: hitNode.data?.points ? hitNode.data.points.map((pointData) => ({ ...pointData })) : undefined,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }

    if (dragState.mode === "pan") {
      const deltaX = event.clientX - dragState.startClient.x;
      const deltaY = event.clientY - dragState.startClient.y;

      renderer.setCamera({
        x: dragState.initialCameraX + deltaX,
        y: dragState.initialCameraY + deltaY,
      });

      setDebug((prev) => ({
        ...prev,
        lastEvent: `viewport:pan:${Math.round(deltaX)},${Math.round(deltaY)}`,
      }));
      return;
    }

    const point = getCanvasPoint(event);
    const worldPoint = renderer.screenToWorld(point);

    if (dragState.mode === "pencil") {
      const lastPoint = dragState.points[dragState.points.length - 1];
      if (lastPoint && distance(lastPoint, worldPoint) < 1) {
        return;
      }

      const nextPoints = [...dragState.points, worldPoint];
      dragStateRef.current = {
        ...dragState,
        points: nextPoints,
      };

      engine.updateNode(dragState.nodeId, (prevNode) => ({
        ...prevNode,
        bounds: buildPathBounds(nextPoints),
        data: {
          ...(prevNode.data ?? {}),
          points: nextPoints,
        },
      }));
      return;
    }

    if (dragState.mode === "arrow") {
      dragStateRef.current = {
        ...dragState,
        endPoint: worldPoint,
      };

      engine.updateNode(dragState.nodeId, (prevNode) => ({
        ...prevNode,
        bounds: buildLineBounds(dragState.startPoint, worldPoint),
        data: {
          ...(prevNode.data ?? {}),
          points: [dragState.startPoint, worldPoint],
        },
      }));
      return;
    }

    if (dragState.mode === "shape") {
      dragStateRef.current = {
        ...dragState,
        endPoint: worldPoint,
      };

      engine.updateNode(dragState.nodeId, (prevNode) => ({
        ...prevNode,
        bounds: buildRectBounds(dragState.startPoint, worldPoint),
      }));
      return;
    }

    const deltaX = worldPoint.x - dragState.startWorld.x;
    const deltaY = worldPoint.y - dragState.startWorld.y;

    const shiftedPoints = dragState.originalPoints
      ? shiftPoints(dragState.originalPoints, deltaX, deltaY)
      : undefined;

    engine.updateNode(dragState.nodeId, (prevNode) => ({
      ...prevNode,
      bounds: shiftedPoints
        ? buildPointsBounds(shiftedPoints)
        : {
            ...prevNode.bounds,
            x: dragState.initialX + deltaX,
            y: dragState.initialY + deltaY,
          },
      data: shiftedPoints
        ? {
            ...(prevNode.data ?? {}),
            points: shiftedPoints,
          }
        : prevNode.data,
    }));
  }

  function handleCanvasPointerEnd(event: React.PointerEvent<HTMLCanvasElement>): void {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (dragState.mode === "pencil") {
      if (dragState.points.length <= 1) {
        engine.removeNode(dragState.nodeId);
      } else {
        engine.setSelection([dragState.nodeId]);
        engine.setTool("select");
      }
    }

    if (dragState.mode === "arrow") {
      if (distance(dragState.startPoint, dragState.endPoint) < 6) {
        engine.removeNode(dragState.nodeId);
      } else {
        engine.setSelection([dragState.nodeId]);
        engine.setTool("select");
      }
    }

    if (dragState.mode === "shape") {
      if (distance(dragState.startPoint, dragState.endPoint) < 6) {
        engine.removeNode(dragState.nodeId);
      } else {
        engine.setSelection([dragState.nodeId]);
        engine.setTool("select");
      }
    }

    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleCanvasDoubleClick(event: React.MouseEvent<HTMLCanvasElement>): void {
    canvasInteractionActiveRef.current = true;
    event.currentTarget.focus();

    const point = getCanvasPoint(event);
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }

    const worldPoint = renderer.screenToWorld(point);
    const scene = engine.getSerializableState();
    const hitNodeId = pickTopNodeAtPoint(scene, worldPoint);
    if (!hitNodeId) {
      return;
    }

    const hitNode = scene.nodes[hitNodeId];
    if (!hitNode || hitNode.type !== "text") {
      return;
    }

    const nextText = window.prompt("Редактирование текста", hitNode.data?.text ?? "") ?? "";
    if (nextText.trim().length === 0) {
      return;
    }

    engine.updateNode(hitNodeId, (prevNode) => ({
      ...prevNode,
      bounds: {
        ...prevNode.bounds,
        width: Math.max(120, nextText.length * 10),
      },
      data: {
        ...(prevNode.data ?? {}),
        text: nextText,
      },
    }));
    engine.setSelection([hitNodeId]);
  }

  function handleCanvasWheel(event: WheelEvent, canvas: HTMLCanvasElement): void {
    canvasInteractionActiveRef.current = true;
    const renderer = rendererRef.current;
    if (!renderer) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      const anchor = getCanvasPointFromClient(canvas, event.clientX, event.clientY);
      const worldAnchor = renderer.screenToWorld(anchor);
      const currentZoom = renderer.getCamera().zoom;
      const targetZoom = clamp(
        currentZoom * Math.exp(-event.deltaY * ZOOM_SENSITIVITY),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      const zoomFactor = targetZoom / currentZoom;

      if (Math.abs(zoomFactor - 1) < 0.001) {
        return;
      }

      const camera = renderer.getCamera();
      renderer.setCamera({
        x: anchor.x - worldAnchor.x * targetZoom,
        y: anchor.y - worldAnchor.y * targetZoom,
        zoom: targetZoom,
      });

      setDebug((prev) => ({
        ...prev,
        lastEvent: `viewport:zoom:${targetZoom.toFixed(2)}`,
      }));
      return;
    }

    const panX = event.shiftKey ? -event.deltaY : -event.deltaX;
    const panY = event.shiftKey ? 0 : -event.deltaY;
    const camera = renderer.getCamera();

    renderer.setCamera({
      x: camera.x + panX,
      y: camera.y + panY,
    });

    setDebug((prev) => ({
      ...prev,
      lastEvent: event.shiftKey
        ? `viewport:pan-x:${Math.round(panX)}`
        : `viewport:pan:${Math.round(panX)},${Math.round(panY)}`,
    }));
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-size-[16px_16px]" />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none overscroll-none cursor-grab active:cursor-grabbing"
        tabIndex={0}
        onBlur={() => {
          canvasInteractionActiveRef.current = false;
        }}
        onDoubleClick={handleCanvasDoubleClick}
        onFocus={() => {
          canvasInteractionActiveRef.current = true;
        }}
        onPointerEnter={() => {
          canvasInteractionActiveRef.current = true;
        }}
        onPointerLeave={() => {
          if (!dragStateRef.current) {
            canvasInteractionActiveRef.current = false;
          }
        }}
        onPointerCancel={handleCanvasPointerEnd}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerEnd}
      />

      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <div className="rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur-sm">
          {debug.cameraZoom.toFixed(2)}x | {debug.selectedCount} selected
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white/95 px-3 py-2 shadow-[0_10px_25px_rgba(15,23,42,0.2)] backdrop-blur-sm">
          {TOOLBAR_TOOLS.map((tool) => {
            const isActive = debug.activeTool === tool.id;
            const Icon = tool.Icon;

            return (
              <button
                key={tool.id}
                className={
                  isActive
                    ? "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500 bg-blue-600 text-white"
                    : "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-50 text-slate-700 hover:border-blue-300 hover:text-blue-700"
                }
                title={`${tool.label} (${tool.hint})`}
                type="button"
                onClick={() => {
                  engine.setTool(tool.id);
                }}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function duplicateSelection(
  engine: ReturnType<typeof createCanvasEngine>,
  selectedNodeIds: NodeId[],
): void {
  const scene = engine.getSerializableState();
  const duplicates: NodeId[] = [];

  engine.batchUpdate(({ addNode }) => {
    for (const sourceNodeId of selectedNodeIds) {
      const sourceNode = scene.nodes[sourceNodeId];
      if (!sourceNode) {
        continue;
      }

      const duplicatedId = `${sourceNode.id}-copy-${Date.now()}-${Math.floor(Math.random() * 999)}`;
      duplicates.push(duplicatedId);

      addNode({
        ...sourceNode,
        id: duplicatedId,
        bounds: {
          ...sourceNode.bounds,
          x: sourceNode.bounds.x + 18,
          y: sourceNode.bounds.y + 18,
        },
      });
    }
  });

  if (duplicates.length > 0) {
    engine.setSelection(duplicates);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildRectBounds(start: Point, end: Point): { x: number; y: number; width: number; height: number } {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxX = Math.max(start.x, end.x);
  const maxY = Math.max(start.y, end.y);

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function buildLineBounds(start: Point, end: Point): { x: number; y: number; width: number; height: number } {
  const minX = Math.min(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxX = Math.max(start.x, end.x);
  const maxY = Math.max(start.y, end.y);

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function buildPathBounds(points: Point[]): { x: number; y: number; width: number; height: number } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function buildPointsBounds(points: Point[]): { x: number; y: number; width: number; height: number } {
  return buildPathBounds(points);
}

function shiftPoints(points: Point[], dx: number, dy: number): Point[] {
  return points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
}

function distance(first: Point, second: Point): number {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCanvasPoint(event: Pick<React.PointerEvent<HTMLCanvasElement>, "clientX" | "clientY" | "currentTarget"> | Pick<React.MouseEvent<HTMLCanvasElement>, "clientX" | "clientY" | "currentTarget">): Point {
  return getCanvasPointFromClient(event.currentTarget, event.clientX, event.clientY);
}

function getCanvasPointFromClient(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Point {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: clientX - bounds.left,
    y: clientY - bounds.top,
  };
}

function pickTopNodeAtPoint(scene: SerializableSceneState, point: Point): NodeId | null {
  for (let index = scene.nodeOrder.length - 1; index >= 0; index -= 1) {
    const nodeId = scene.nodeOrder[index];
    const node = scene.nodes[nodeId];
    if (!node) {
      continue;
    }

    if (isPointInsideNodeBounds(point, node)) {
      return nodeId;
    }
  }

  return null;
}

function isPointInsideNodeBounds(point: Point, node: SceneNode): boolean {
  const { x, y, width, height } = node.bounds;

  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

function getSceneCounters(engine: ReturnType<typeof createCanvasEngine>): {
  nodeCount: number;
  layerCount: number;
} {
  const scene = engine.getSerializableState();

  return {
    nodeCount: scene.nodeOrder.length,
    layerCount: scene.layerOrder.length,
  };
}

function createRendererDemoScene(version = 1): SerializableSceneState {
  return {
    ...createEmptySerializableSceneState(),
    version,
    layerOrder: [DEFAULT_LAYER_ID],
    nodeOrder: ["node-rect", "node-triangle", "node-arrow", "node-text"],
    nodes: {
      "node-rect": {
        id: "node-rect",
        layerId: DEFAULT_LAYER_ID,
        type: "rect",
        bounds: { x: 92, y: 78, width: 184, height: 120 },
        transform: createIdentityTransform(),
        style: {
          fill: "#2563eb",
          stroke: "#1e3a8a",
          strokeWidth: 2,
          opacity: 0.88,
        },
      },
      "node-triangle": {
        id: "node-triangle",
        layerId: DEFAULT_LAYER_ID,
        type: "triangle",
        bounds: { x: 316, y: 240, width: 152, height: 132 },
        transform: createIdentityTransform(),
        style: {
          fill: "#f97316",
          stroke: "#9a3412",
          strokeWidth: 2,
          opacity: 0.9,
        },
      },
      "node-arrow": {
        id: "node-arrow",
        layerId: DEFAULT_LAYER_ID,
        type: "arrow",
        bounds: { x: 180, y: 340, width: 220, height: 80 },
        transform: createIdentityTransform(),
        style: {
          stroke: "#0f172a",
          strokeWidth: 3,
          opacity: 1,
        },
      },
      "node-text": {
        id: "node-text",
        layerId: DEFAULT_LAYER_ID,
        type: "text",
        bounds: { x: 72, y: 28, width: 240, height: 24 },
        transform: createIdentityTransform(),
        style: {
          fill: "#0f172a",
        },
        data: {
          text: "Renderer step 2 smoke scene",
        },
      },
    },
  };
}