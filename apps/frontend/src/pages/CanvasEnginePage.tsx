import { ArrowRight, Circle, Image as ImageIcon, MousePointer2, Pencil, Square, Triangle, Type } from "lucide-react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { CanvasEditorLayout, EditorWorkspaceProvider } from "@/components/editor";
import { AUTOSAVE_PROJECT_MUTATION, PROJECT_QUERY } from "../graphql/projects.graphql";
import { sceneStateFromProjectContent } from "@/shared/lib/editor/scene-from-project-content";

import {
  DEFAULT_LAYER_ID,
  ENGINE_TOOLS,
  CanvasRenderer,
  applyMat2DToPoint,
  composeNodeLocalToWorldMatrix,
  createIdentityTransform,
  createCanvasEngine,
  createEmptySerializableSceneState,
  createStressScene,
  deserializeSceneFromJson,
  getDefaultNodePivot,
  getNodeWorldBounds,
  hitTestNodeAtWorldPoint,
  pickTopMostNodeAtWorldPoint,
  serializeSceneToJson,
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
const HANDLE_SIZE = 10;
const ROTATE_HANDLE_OFFSET = 28;
const ROTATE_HANDLE_RADIUS = 6;

type CanvasToolUiItem = {
  id: ToolName;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
};

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const TOOLBAR_TOOLS: CanvasToolUiItem[] = [
  { id: "select", label: "Select", hint: "V", Icon: MousePointer2 },
  { id: "pencil", label: "Pencil", hint: "P", Icon: Pencil },
  { id: "text", label: "Text", hint: "T", Icon: Type },
  { id: "rect", label: "Rect", hint: "R", Icon: Square },
  { id: "triangle", label: "Triangle", hint: "G", Icon: Triangle },
  { id: "ellipse", label: "Ellipse", hint: "E", Icon: Circle },
  { id: "arrow", label: "Arrow", hint: "A", Icon: ArrowRight },
  { id: "image", label: "Image", hint: "I", Icon: ImageIcon },
];

type DragState =
  | {
      mode: "node";
      pointerId: number;
      nodeIds: NodeId[];
      startWorld: Point;
      initialPositions: Record<NodeId, { x: number; y: number; originalPoints?: Point[] }>;
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
      tool: "rect" | "triangle" | "ellipse" | "image";
      startPoint: Point;
      endPoint: Point;
    }
  | {
      mode: "selection-box";
      pointerId: number;
      startWorld: Point;
      endWorld: Point;
    }
  | {
      mode: "resize";
      pointerId: number;
      nodeId: NodeId;
      handle: ResizeHandle;
      startWorld: Point;
      startBounds: { x: number; y: number; width: number; height: number };
    }
  | {
      mode: "rotate";
      pointerId: number;
      nodeId: NodeId;
      center: Point;
      startAngle: number;
      startRotation: number;
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
  const autosaveTimerRef = useRef<number | null>(null);
  const lastSentJsonRef = useRef<string>("");
  const hydratedEditorProjectIdRef = useRef<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const standaloneMode = location.pathname === "/canvas-engine";
  const isEditorRoute = location.pathname === "/editor";
  const projectId = searchParams.get("projectId");

  const {
    data: projectData,
    loading: projectLoading,
    error: projectQueryError,
  } = useQuery(PROJECT_QUERY, {
    variables: { id: projectId ?? "" },
    skip: standaloneMode || !projectId,
  });

  const [autosaveProject] = useMutation(AUTOSAVE_PROJECT_MUTATION);
  const [autosaveLabel, setAutosaveLabel] = useState<string>("");
  const [editorGridEnabled, setEditorGridEnabled] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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

  const [selectionBoxRect, setSelectionBoxRect] = useState<{
    screenX: number;
    screenY: number;
    screenWidth: number;
    screenHeight: number;
  } | null>(null);

  const saveNow = useCallback(async () => {
    if (!projectId || standaloneMode) return;
    const json = engine.exportSceneJson();
    await autosaveProject({
      variables: { id: projectId, content: JSON.parse(json) as Record<string, unknown> },
    });
    lastSentJsonRef.current = json;
    setHasUnsavedChanges(false);
    setAutosaveLabel("Saved");
    window.setTimeout(() => {
      setAutosaveLabel((s) => (s === "Saved" ? "" : s));
    }, 1500);
  }, [projectId, standaloneMode, engine, autosaveProject]);

  const applyProjectContent = useCallback(
    (content: unknown) => {
      const scene = sceneStateFromProjectContent(content);
      engine.replaceScene(scene, { recordHistory: false });
      engine.setSelection([]);
      lastSentJsonRef.current = engine.exportSceneJson();
      setHasUnsavedChanges(false);
    },
    [engine],
  );

  const zoomIn = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const c = r.getCamera();
    r.setCamera({ zoom: Math.min(MAX_ZOOM, c.zoom * 1.12) });
  }, []);

  const zoomOut = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    const c = r.getCamera();
    r.setCamera({ zoom: Math.max(MIN_ZOOM, c.zoom / 1.12) });
  }, []);

  const zoomReset = useCallback(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.setCamera({ x: 0, y: 0, zoom: 1 });
  }, []);

  const projectMeta = (projectData as { project?: { title?: string; width?: number; height?: number } } | null | undefined)
    ?.project;
  const projectTitle = projectMeta?.title ?? null;
  const projectWidth = projectMeta?.width ?? 800;
  const projectHeight = projectMeta?.height ?? 600;

  const workspaceValue = useMemo(
    () => ({
      engine,
      projectId,
      projectTitle,
      projectWidth,
      projectHeight,
      autosaveLabel,
      saveNow,
      applyProjectContent,
      zoomIn,
      zoomOut,
      zoomReset,
      cameraZoomPercent: Math.min(400, Math.max(25, Math.round(debug.cameraZoom * 100))),
      gridEnabled: editorGridEnabled,
      setGridEnabled: setEditorGridEnabled,
    }),
    [
      engine,
      projectId,
      projectTitle,
      projectWidth,
      projectHeight,
      autosaveLabel,
      saveNow,
      applyProjectContent,
      zoomIn,
      zoomOut,
      zoomReset,
      debug.cameraZoom,
      editorGridEnabled,
    ],
  );

  useEffect(() => {
    if (standaloneMode || !isEditorRoute) {
      return;
    }
    if (!projectId) {
      navigate("/projects?new=1", { replace: true });
    }
  }, [standaloneMode, isEditorRoute, projectId, navigate]);

  useEffect(() => {
    if (standaloneMode) {
      hydratedEditorProjectIdRef.current = "__canvas_engine__";
      engine.replaceScene(createRendererDemoScene(), { recordHistory: false });
      engine.setSelection(["node-rect"]);
      setAutosaveLabel("");
      setHasUnsavedChanges(false);
      return;
    }

    if (!projectId) {
      return;
    }

    if (projectLoading) {
      return;
    }

    const proj = (projectData as { project?: { content?: unknown } } | null | undefined)?.project;
    if (projectQueryError || !proj) {
      hydratedEditorProjectIdRef.current = null;
      engine.replaceScene(createEmptySerializableSceneState(), { recordHistory: false });
      engine.setSelection([]);
      lastSentJsonRef.current = engine.exportSceneJson();
      setHasUnsavedChanges(false);
      setAutosaveLabel("");
      return;
    }

    if (hydratedEditorProjectIdRef.current === projectId) {
      return;
    }

    hydratedEditorProjectIdRef.current = projectId;
    const scene = sceneStateFromProjectContent(proj.content);
    engine.replaceScene(scene, { recordHistory: false });
    engine.setSelection([]);
    lastSentJsonRef.current = engine.exportSceneJson();
    setHasUnsavedChanges(false);
    setAutosaveLabel("");
  }, [standaloneMode, projectId, projectLoading, projectQueryError, projectData, engine]);

  useEffect(() => {
    if (standaloneMode || !projectId || projectLoading || projectQueryError) {
      return;
    }

    const proj = (projectData as { project?: { content?: unknown } } | null | undefined)?.project;
    if (!proj) {
      return;
    }

    const flushAutosave = () => {
      const json = engine.exportSceneJson();
      if (json === lastSentJsonRef.current) {
        return;
      }
      setAutosaveLabel("Saving…");
      void autosaveProject({
        variables: {
          id: projectId,
          content: JSON.parse(json) as Record<string, unknown>,
        },
      })
        .then(() => {
          lastSentJsonRef.current = json;
          setHasUnsavedChanges(false);
          setAutosaveLabel("Saved");
          window.setTimeout(() => {
            setAutosaveLabel((s) => (s === "Saved" ? "" : s));
          }, 2000);
        })
        .catch(() => {
          setAutosaveLabel("Save failed");
        });
    };

    const unsub = engine.events.on("scene:changed", () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      autosaveTimerRef.current = window.setTimeout(flushAutosave, 1200);
    });

    return () => {
      unsub();
        if (autosaveTimerRef.current) {
          window.clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
    };
  }, [standaloneMode, projectId, projectLoading, projectQueryError, projectData, engine, autosaveProject]);

  useEffect(() => {
    if (standaloneMode) {
      return;
    }

    const off = engine.events.on("scene:changed", () => {
      const json = engine.exportSceneJson();
      setHasUnsavedChanges(json !== lastSentJsonRef.current);
    });

    return () => {
      off();
    };
  }, [engine, standaloneMode]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [hasUnsavedChanges]);

  const confirmNavigation = useCallback(
    (nextPath: string) => {
      if (!hasUnsavedChanges) {
        navigate(nextPath);
        return;
      }

      const allow = window.confirm("You have unsaved changes. Leave anyway?");
      if (allow) {
        navigate(nextPath);
      }
    },
    [hasUnsavedChanges, navigate],
  );

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

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
      const hasModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const isUndoRedo = hasModifier && (key === "z" || key === "y");
      const isSceneJsonShortcut = hasModifier && event.shiftKey && (key === "s" || key === "o");

      // Allow core shortcuts even before first canvas interaction.
      if (!canvasInteractionActiveRef.current && !isUndoRedo && !isSceneJsonShortcut) {
        return;
      }

      const runtime = engine.getRuntimeSnapshot();
      const selectedNodeIds = runtime.selectedNodeIds;
      const hasSelection = selectedNodeIds.length > 0;

      if (hasModifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        console.debug("[canvas] undo/redo hotkey", { key: event.key, shift: event.shiftKey, canUndo: engine.canUndo(), canRedo: engine.canRedo() });
        if (event.shiftKey) {
          engine.redo();
        } else {
          engine.undo();
        }
        return;
      }

      if (hasModifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        console.debug("[canvas] redo hotkey", { key: event.key, canUndo: engine.canUndo(), canRedo: engine.canRedo() });
        engine.redo();
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && hasSelection) {
        event.preventDefault();
        const scene = engine.getSerializableState();
        const deletable = selectedNodeIds.filter((id) => !scene.nodes[id]?.data?.locked);
        if (deletable.length > 0) {
          engine.batchUpdate(({ removeNode }) => {
            for (const nodeId of deletable) {
              removeNode(nodeId);
            }
          }, { history: { label: "delete-selection" } });
        }
        engine.setSelection(selectedNodeIds.filter((id) => scene.nodes[id]?.data?.locked));
        return;
      }

      if (hasModifier && !event.shiftKey && event.key.toLowerCase() === "g" && hasSelection) {
        event.preventDefault();
        const scene = engine.getSerializableState();
        const eligible = selectedNodeIds.filter((id) => !scene.nodes[id]?.data?.locked);
        if (eligible.length === 0) {
          return;
        }
        const groupId = `group-${Date.now()}`;
        engine.batchUpdate(({ updateNode }) => {
          for (const nodeId of eligible) {
            updateNode(nodeId, (prevNode) => ({
              ...prevNode,
              data: {
                ...(prevNode.data ?? {}),
                groupId,
              },
            }));
          }
        }, { history: { label: "group", mergeKey: `group:${groupId}` } });
        return;
      }

      if ((hasModifier && event.shiftKey && event.key.toLowerCase() === "d") && hasSelection) {
        event.preventDefault();
        const scene = engine.getSerializableState();
        const eligible = selectedNodeIds.filter((id) => !scene.nodes[id]?.data?.locked);
        if (eligible.length === 0) {
          return;
        }
        duplicateSelection(engine, eligible);

        return;
      }

      if (!hasModifier && !event.shiftKey && event.key.toLowerCase() === "d" && hasSelection) {
        event.preventDefault();
        const scene = engine.getSerializableState();
        const eligible = selectedNodeIds.filter((id) => !scene.nodes[id]?.data?.locked);
        if (eligible.length === 0) {
          return;
        }
        duplicateSelection(engine, eligible);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        engine.setSelection([]);
        if (debug.activeTool !== "select") {
          engine.setTool("select");
        }
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        if (debug.activeTool === "select") {
          handleReplaceScene();
        }
        return;
      }

      // Stress test: Ctrl/Cmd+Alt+1/2/3 → 100/500/1000 nodes
      if (hasModifier && event.altKey) {
        const stressMap: Record<string, number> = { "1": 100, "2": 500, "3": 1000 };
        const count = stressMap[event.key];
        if (count !== undefined) {
          event.preventDefault();
          console.debug(`[canvas] stress scene: ${count} nodes`);
          engine.replaceScene(createStressScene(count));
          engine.setSelection([]);
          return;
        }
      }

      if (hasModifier && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        console.debug("[canvas] export scene json → download file");
        downloadSceneJson(serializeSceneToJson(engine.getSerializableState()));
        return;
      }

      if (hasModifier && event.shiftKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        console.debug("[canvas] import scene json ← pick file");
        pickSceneJsonFile((json) => {
          const result = deserializeSceneFromJson(json);
          if (!result.ok) {
            window.alert(`Import failed: ${result.error}`);
            return;
          }
          engine.replaceScene(result.scene, { history: { label: "import-scene" } });
          engine.setSelection([]);
        });
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
        const scene = engine.getSerializableState();
        const eligible = selectedNodeIds.filter((id) => !scene.nodes[id]?.data?.locked);
        if (eligible.length === 0) {
          return;
        }
        engine.batchUpdate(({ updateNode }) => {
          for (const nodeId of eligible) {
            updateNode(nodeId, (prevNode) => ({
              ...prevNode,
              bounds: {
                ...prevNode.bounds,
                x: prevNode.bounds.x + arrowMove.x,
                y: prevNode.bounds.y + arrowMove.y,
              },
            }));
          }
        }, { history: { label: "nudge", mergeKey: `nudge:${selectedNodeIds.sort().join(",")}` } });
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
      const textValue = window.prompt("Enter text", "New text");
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

    if (activeTool === "rect" || activeTool === "triangle" || activeTool === "ellipse" || activeTool === "image") {
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

    const runtime = engine.getRuntimeSnapshot();
    const selectedNodeId = runtime.selectedNodeIds.length === 1 ? runtime.selectedNodeIds[0] : null;
    const selectedNode = selectedNodeId ? scene.nodes[selectedNodeId] : null;
    const selectedNodeLocked = selectedNode?.data?.locked;

    if (selectedNode && !selectedNodeLocked) {
      const camera = renderer.getCamera();
      const handleSizeWorld = HANDLE_SIZE / camera.zoom;
      const rotateOffsetWorld = ROTATE_HANDLE_OFFSET / camera.zoom;
      const rotateRadiusWorld = ROTATE_HANDLE_RADIUS / camera.zoom;
      const center = getNodePivotWorld(selectedNode);
      const rotateHandle = getRotateHandlePoint(selectedNode, rotateOffsetWorld);

      if (isPointInCircle(worldPoint, rotateHandle, rotateRadiusWorld)) {
        const startAngle = radiansToDegrees(Math.atan2(worldPoint.y - center.y, worldPoint.x - center.x));
        dragStateRef.current = {
          mode: "rotate",
          pointerId: event.pointerId,
          nodeId: selectedNode.id,
          center,
          startAngle,
          startRotation: selectedNode.transform.rotate,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
        return;
      }

      if (!selectedNode.data?.points) {
        const resizeHandle = findResizeHandleAtPoint(
          worldPoint,
          selectedNode.bounds,
          handleSizeWorld,
        );

        if (resizeHandle) {
          dragStateRef.current = {
            mode: "resize",
            pointerId: event.pointerId,
            nodeId: selectedNode.id,
            handle: resizeHandle,
            startWorld: worldPoint,
            startBounds: { ...selectedNode.bounds },
          };

          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
      }
    }

    const hitNodeId = pickTopNodeAtPoint(scene, worldPoint);

    if (!hitNodeId) {
      if (!event.shiftKey) {
        engine.setSelection([]);
      }

      // Start selection box or pan based on Shift
      if (event.shiftKey) {
        const camera = renderer.getCamera();
        dragStateRef.current = {
          mode: "pan",
          pointerId: event.pointerId,
          startClient: { x: event.clientX, y: event.clientY },
          initialCameraX: camera.x,
          initialCameraY: camera.y,
        };
      } else {
        dragStateRef.current = {
          mode: "selection-box",
          pointerId: event.pointerId,
          startWorld: worldPoint,
          endWorld: worldPoint,
        };
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const currentSelection = engine.getRuntimeSnapshot().selectedNodeIds;
    let nextSelection = currentSelection;
    const hitGroupedIds = getGroupedNodeIds(scene, [hitNodeId]);

    if (event.shiftKey) {
      const isAlreadySelected = currentSelection.includes(hitNodeId);
      if (isAlreadySelected) {
        nextSelection = currentSelection.filter((id) => !hitGroupedIds.includes(id));
        engine.setSelection(nextSelection);
        return;
      } else {
        nextSelection = Array.from(new Set([...currentSelection, ...hitGroupedIds]));
        engine.setSelection(nextSelection);
      }
    } else {
      if (!currentSelection.includes(hitNodeId)) {
        nextSelection = hitGroupedIds;
        engine.setSelection(nextSelection);
      } else {
        nextSelection = getGroupedNodeIds(scene, currentSelection);
        if (nextSelection.length !== currentSelection.length) {
          engine.setSelection(nextSelection);
        }
      }
    }

    const initialPositions: Record<NodeId, { x: number; y: number; originalPoints?: Point[] }> = {};
    const draggableSelection = nextSelection.filter((id) => !scene.nodes[id]?.data?.locked);
    if (draggableSelection.length === 0) {
      return;
    }
    for (const id of draggableSelection) {
      const node = scene.nodes[id];
      if (node) {
        initialPositions[id] = {
          x: node.bounds.x,
          y: node.bounds.y,
          originalPoints: node.data?.points ? node.data.points.map((pointData) => ({ ...pointData })) : undefined,
        };
      }
    }

    dragStateRef.current = {
      mode: "node",
      pointerId: event.pointerId,
      nodeIds: draggableSelection,
      startWorld: worldPoint,
      initialPositions,
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

    const point = getCanvasPoint(event);
    const worldPoint = renderer.screenToWorld(point);

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

    if (dragState.mode === "selection-box") {
      dragStateRef.current = {
        ...dragState,
        endWorld: worldPoint,
      };

      // Update selection-box visual preview
      const camera = renderer.getCamera();
      const screenStart = {
        x: dragState.startWorld.x * camera.zoom + camera.x,
        y: dragState.startWorld.y * camera.zoom + camera.y,
      };
      const screenEnd = {
        x: worldPoint.x * camera.zoom + camera.x,
        y: worldPoint.y * camera.zoom + camera.y,
      };

      const minX = Math.min(screenStart.x, screenEnd.x);
      const minY = Math.min(screenStart.y, screenEnd.y);
      const maxX = Math.max(screenStart.x, screenEnd.x);
      const maxY = Math.max(screenStart.y, screenEnd.y);

      setSelectionBoxRect({
        screenX: minX,
        screenY: minY,
        screenWidth: maxX - minX,
        screenHeight: maxY - minY,
      });

      setDebug((prev) => ({
        ...prev,
        lastEvent: `selection:box:preview`,
      }));
      return;
    }

    if (dragState.mode === "resize") {
      const deltaX = worldPoint.x - dragState.startWorld.x;
      const deltaY = worldPoint.y - dragState.startWorld.y;
      const nextBounds = applyResizeHandle(dragState.startBounds, dragState.handle, deltaX, deltaY);

      engine.updateNode(dragState.nodeId, (prevNode) => ({
        ...prevNode,
        bounds: nextBounds,
      }), { history: { label: "resize", mergeKey: `resize:${dragState.nodeId}` } });

      setDebug((prev) => ({
        ...prev,
        lastEvent: `node:resize:${dragState.handle}`,
      }));
      return;
    }

    if (dragState.mode === "rotate") {
      const angle = radiansToDegrees(Math.atan2(worldPoint.y - dragState.center.y, worldPoint.x - dragState.center.x));
      const nextRotation = dragState.startRotation + (angle - dragState.startAngle);

      engine.updateNode(dragState.nodeId, (prevNode) => ({
        ...prevNode,
        transform: {
          ...prevNode.transform,
          rotate: nextRotation,
        },
      }), { history: { label: "rotate", mergeKey: `rotate:${dragState.nodeId}` } });

      setDebug((prev) => ({
        ...prev,
        lastEvent: `node:rotate:${Math.round(nextRotation)}`,
      }));
      return;
    }

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
      }), { history: { label: "draw", mergeKey: `draw:${dragState.nodeId}` } });
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
      }), { history: { label: "arrow", mergeKey: `arrow:${dragState.nodeId}` } });
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
      }), { history: { label: "shape", mergeKey: `shape:${dragState.nodeId}` } });
      return;
    }

    if (dragState.mode === "node") {
      const deltaX = worldPoint.x - dragState.startWorld.x;
      const deltaY = worldPoint.y - dragState.startWorld.y;

      engine.batchUpdate(({ updateNode }) => {
        for (const nodeId of dragState.nodeIds) {
          const initial = dragState.initialPositions[nodeId];
          if (!initial) continue;

          const shiftedPoints = initial.originalPoints
            ? shiftPoints(initial.originalPoints, deltaX, deltaY)
            : undefined;

          updateNode(nodeId, (prevNode) => ({
            ...prevNode,
            bounds: shiftedPoints
              ? buildPointsBounds(shiftedPoints)
              : {
                  ...prevNode.bounds,
                  x: initial.x + deltaX,
                  y: initial.y + deltaY,
                },
            data: shiftedPoints
              ? {
                  ...(prevNode.data ?? {}),
                  points: shiftedPoints,
                }
              : prevNode.data,
          }));
        }
      }, { history: { label: "move", mergeKey: `move:${dragState.nodeIds.slice().sort().join(",")}` } });
    }
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
      }
    }

    if (dragState.mode === "arrow") {
      if (distance(dragState.startPoint, dragState.endPoint) < 6) {
        engine.removeNode(dragState.nodeId);
      } else {
        engine.setSelection([dragState.nodeId]);
      }
    }

    if (dragState.mode === "shape") {
      if (distance(dragState.startPoint, dragState.endPoint) < 6) {
        engine.removeNode(dragState.nodeId);
      } else {
        engine.setSelection([dragState.nodeId]);
      }
    }

    if (dragState.mode === "selection-box") {
      const boxBounds = buildRectBounds(dragState.startWorld, dragState.endWorld);
      const scene = engine.getSerializableState();
      const selectedIds: NodeId[] = [];

      for (const nodeId of scene.nodeOrder) {
        const node = scene.nodes[nodeId];
        if (!node) continue;

        const nodeBox = getNodeWorldBounds(node);
        const isInside =
          nodeBox.x < boxBounds.x + boxBounds.width &&
          nodeBox.x + nodeBox.width > boxBounds.x &&
          nodeBox.y < boxBounds.y + boxBounds.height &&
          nodeBox.y + nodeBox.height > boxBounds.y;

        if (node.data?.hidden || node.data?.locked) {
          continue;
        }

        if (isInside) {
          selectedIds.push(nodeId);
        }
      }

      engine.setSelection(selectedIds);
      setSelectionBoxRect(null);
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

    const nextText = window.prompt("Edit text", hitNode.data?.text ?? "") ?? "";
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

  const handleCanvasDragOver = useCallback((event: DragEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleCanvasDrop = useCallback(
    async (event: DragEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      if (files.length === 0) {
        return;
      }

      const canvas = event.currentTarget;
      const renderer = rendererRef.current;
      if (!renderer) {
        return;
      }

      const point = getCanvasPointFromClient(canvas, event.clientX, event.clientY);
      const worldPoint = renderer.screenToWorld(point);

      const readAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = () => reject(new Error("read failed"));
          r.readAsDataURL(file);
        });

      const file = files[0]!;
      let src: string;
      try {
        src = await readAsDataUrl(file);
      } catch {
        return;
      }

      const rt = engine.getRuntimeSnapshot();
      const one = rt.selectedNodeIds.length === 1 ? rt.selectedNodeIds[0] : null;
      const sel = one ? engine.getSerializableState().nodes[one] : null;

      if (sel?.type === "image") {
        engine.updateNode(one!, (prev) => ({
          ...prev,
          data: { ...(prev.data ?? {}), src },
        }));
        engine.setSelection([one!]);
        return;
      }

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("img"));
        img.src = src;
      }).catch(() => undefined);

      const nw = img.naturalWidth || 320;
      const nh = img.naturalHeight || 240;
      const maxSide = 480;
      let w = nw;
      let h = nh;
      if (w > maxSide) {
        h = (h / w) * maxSide;
        w = maxSide;
      }
      if (h > maxSide) {
        w = (w / h) * maxSide;
        h = maxSide;
      }

      const id = `image-${Date.now()}`;
      engine.addNode({
        id,
        layerId: DEFAULT_LAYER_ID,
        type: "image",
        bounds: { x: worldPoint.x - w / 2, y: worldPoint.y - h / 2, width: w, height: h },
        transform: createIdentityTransform(),
        style: { fill: "#e2e8f0", stroke: "#1e293b", strokeWidth: 1, opacity: 1 },
        data: { src },
      });
      engine.setSelection([id]);
    },
    [engine],
  );

  const runtimeSnapshot = engine.getRuntimeSnapshot();
  const selectedNodeId = runtimeSnapshot.selectedNodeIds.length === 1 ? runtimeSnapshot.selectedNodeIds[0] : null;
  const selectedNode = selectedNodeId ? engine.getSerializableState().nodes[selectedNodeId] : null;
  const showHandles = debug.activeTool === "select" && Boolean(selectedNode);
  const camera = rendererRef.current?.getCamera() ?? {
    x: debug.cameraX,
    y: debug.cameraY,
    zoom: debug.cameraZoom,
  };
  const resizeHandles =
    showHandles && selectedNode && !selectedNode.data?.points
      ? getResizeHandles(selectedNode.bounds)
      : [];
  const rotateHandle = showHandles && selectedNode
    ? getRotateHandlePoint(selectedNode, ROTATE_HANDLE_OFFSET / camera.zoom)
    : null;

  const canvasSurface = (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_2px,transparent_2px)] bg-size-[16px_16px]" />

      {!standaloneMode && projectId && projectLoading ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 text-sm font-medium text-slate-100 backdrop-blur-[2px]">
          Loading project…
        </div>
      ) : null}

      {!standaloneMode && projectId && projectQueryError && !projectLoading ? (
        <div className="pointer-events-auto absolute left-1/2 top-16 z-30 w-[min(92vw,28rem)] -translate-x-1/2 rounded-xl border border-rose-400/60 bg-rose-950/95 px-4 py-3 text-sm text-rose-50 shadow-lg">
          <span>Could not load project: {projectQueryError.message}</span>
          <Link className="ml-2 font-semibold text-emerald-300 underline underline-offset-2 hover:text-emerald-200" to="/projects">
            Back to projects
          </Link>
        </div>
      ) : null}

      {!standaloneMode && projectId && !projectLoading && !projectQueryError ? (
        <div className="pointer-events-none absolute right-4 top-4 z-20 text-right text-xs text-slate-600">
          <button
            type="button"
            className="pointer-events-auto font-medium text-emerald-700 underline-offset-2 hover:underline"
            onClick={() => confirmNavigation("/projects")}
          >
            All projects
          </button>
        </div>
      ) : null}

      {!standaloneMode && editorGridEnabled ? (
        <div
          className="pointer-events-none absolute inset-0 z-1"
          style={{
            backgroundImage: `
              linear-gradient(0deg, rgba(148,163,184,0.35) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />
      ) : null}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none overscroll-none cursor-grab active:cursor-grabbing"
        tabIndex={0}
        onDragOver={handleCanvasDragOver}
        onDrop={(e) => void handleCanvasDrop(e)}
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

      {/* Selection box preview overlay */}
      {selectionBoxRect && (
        <div
          className="pointer-events-none absolute border-2 border-blue-500 bg-blue-400/10"
          style={{
            left: `${selectionBoxRect.screenX}px`,
            top: `${selectionBoxRect.screenY}px`,
            width: `${selectionBoxRect.screenWidth}px`,
            height: `${selectionBoxRect.screenHeight}px`,
          }}
        />
      )}

      {showHandles && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {rotateHandle && (
            <div
              className="absolute rounded-full border-2 border-emerald-300 bg-slate-950"
              style={(() => {
                const screen = worldToScreen(rotateHandle, camera);
                const size = ROTATE_HANDLE_RADIUS * 2;
                return {
                  left: `${screen.x - size / 2}px`,
                  top: `${screen.y - size / 2}px`,
                  width: `${size}px`,
                  height: `${size}px`,
                };
              })()}
            />
          )}
          {resizeHandles.map((handle) => {
            const screen = worldToScreen(handle, camera);
            const size = HANDLE_SIZE;
            return (
              <div
                key={handle.id}
                className="absolute rounded-sm border border-slate-200 bg-slate-900"
                style={{
                  left: `${screen.x - size / 2}px`,
                  top: `${screen.y - size / 2}px`,
                  width: `${size}px`,
                  height: `${size}px`,
                }}
              />
            );
          })}
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-1.5">
        <div className="rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur-sm">
          {debug.cameraZoom.toFixed(2)}x · {debug.selectedCount} sel · {debug.nodeCount} nodes
        </div>
        <div className="rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-mono text-slate-600 backdrop-blur-sm">
          {debug.frameTimeMs > 0 && Number.isFinite(1000 / debug.frameTimeMs)
            ? `${debug.frameTimeMs.toFixed(1)} ms · ~${Math.round(1000 / debug.frameTimeMs)} fps · ${debug.renderedNodes} drawn`
            : "idle"}
        </div>
      </div>

      {standaloneMode ? (
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
      ) : null}
    </>
  );

  if (standaloneMode) {
    return (
      <main className="relative h-screen w-screen overflow-hidden bg-slate-100 font-sans">{canvasSurface}</main>
    );
  }

  return (
    <EditorWorkspaceProvider value={workspaceValue}>
      <CanvasEditorLayout
        canvas={
          <div className="relative h-full min-h-0 w-full overflow-hidden bg-slate-100 font-sans">{canvasSurface}</div>
        }
      />
    </EditorWorkspaceProvider>
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

function downloadSceneJson(json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `canvas-scene-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function pickSceneJsonFile(onLoad: (json: string) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.style.display = "none";
  document.body.appendChild(input);
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) {
      document.body.removeChild(input);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      document.body.removeChild(input);
      if (typeof text === "string") {
        onLoad(text);
      }
    };
    reader.readAsText(file);
  });
  input.click();
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

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function getNodePivotWorld(node: SceneNode): Point {
  const pivotLocal = getDefaultNodePivot(node.bounds);
  const m = composeNodeLocalToWorldMatrix(node);
  return applyMat2DToPoint(m, pivotLocal);
}

function getRotateHandlePoint(node: SceneNode, offset: number): Point {
  const worldBounds = getNodeWorldBounds(node);
  return {
    x: worldBounds.x + worldBounds.width / 2,
    y: worldBounds.y - offset,
  };
}

function getResizeHandles(bounds: { x: number; y: number; width: number; height: number }): Array<{ id: ResizeHandle; x: number; y: number }> {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;

  return [
    { id: "nw", x, y },
    { id: "n", x: cx, y },
    { id: "ne", x: x + width, y },
    { id: "e", x: x + width, y: cy },
    { id: "se", x: x + width, y: y + height },
    { id: "s", x: cx, y: y + height },
    { id: "sw", x, y: y + height },
    { id: "w", x, y: cy },
  ];
}

function findResizeHandleAtPoint(
  point: Point,
  bounds: { x: number; y: number; width: number; height: number },
  size: number,
): ResizeHandle | null {
  const half = size / 2;
  const handles = getResizeHandles(bounds);

  for (const handle of handles) {
    if (
      point.x >= handle.x - half &&
      point.x <= handle.x + half &&
      point.y >= handle.y - half &&
      point.y <= handle.y + half
    ) {
      return handle.id;
    }
  }

  return null;
}

function applyResizeHandle(
  bounds: { x: number; y: number; width: number; height: number },
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
): { x: number; y: number; width: number; height: number } {
  const minSize = 12;
  let nextX = bounds.x;
  let nextY = bounds.y;
  let nextWidth = bounds.width;
  let nextHeight = bounds.height;

  if (handle.includes("e")) {
    nextWidth = Math.max(minSize, bounds.width + deltaX);
  }

  if (handle.includes("s")) {
    nextHeight = Math.max(minSize, bounds.height + deltaY);
  }

  if (handle.includes("w")) {
    nextWidth = Math.max(minSize, bounds.width - deltaX);
    nextX = bounds.x + (bounds.width - nextWidth);
  }

  if (handle.includes("n")) {
    nextHeight = Math.max(minSize, bounds.height - deltaY);
    nextY = bounds.y + (bounds.height - nextHeight);
  }

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}

function isPointInCircle(point: Point, center: Point, radius: number): boolean {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return dx * dx + dy * dy <= radius * radius;
}

function worldToScreen(point: Point, camera: { x: number; y: number; zoom: number }): Point {
  return {
    x: point.x * camera.zoom + camera.x,
    y: point.y * camera.zoom + camera.y,
  };
}

function getGroupedNodeIds(scene: SerializableSceneState, nodeIds: NodeId[]): NodeId[] {
  const result = new Set<NodeId>();
  const groupIds = new Set<string>();

  for (const id of nodeIds) {
    const node = scene.nodes[id];
    if (!node) continue;
    result.add(id);
    if (node.data?.groupId) {
      groupIds.add(node.data.groupId);
    }
  }

  if (groupIds.size > 0) {
    for (const id of scene.nodeOrder) {
      const node = scene.nodes[id];
      if (node?.data?.groupId && groupIds.has(node.data.groupId)) {
        result.add(id);
      }
    }
  }

  return Array.from(result);
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
  return pickTopMostNodeAtWorldPoint(scene, point) as NodeId | null;
}

function isPointInsideNodeBounds(point: Point, node: SceneNode): boolean {
  // Backwards compatible alias. Real logic moved into engine hit-test utilities.
  // Still used by some call-sites in this file.
  return hitTestNodeAtWorldPoint(node, point);
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

