import type { FC } from "react";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Circle,
  Image,
  MousePointer2,
  Pencil,
  Shapes,
  Square,
  Triangle,
  Type,
} from "lucide-react";

import { ENGINE_SHAPE_TOOLS, type ToolName } from "@/shared/lib/canvas-engine";
import { useOptionalEditorWorkspace } from "./editor-workspace-context";

const PRIMARY_DOCK_TOOLS: Array<{ id: ToolName; label: string; Icon: FC<{ className?: string }> }> = [
  { id: "select", label: "Select", Icon: MousePointer2 },
  { id: "pencil", label: "Pencil", Icon: Pencil },
  { id: "text", label: "Text", Icon: Type },
  { id: "arrow", label: "Arrow", Icon: ArrowRight },
  { id: "image", label: "Image", Icon: Image },
];

const SHAPE_ICONS: Record<string, FC<{ className?: string }>> = {
  rect: Square,
  triangle: Triangle,
  ellipse: Circle,
};

export const EditorToolsDock: FC = () => {
  const workspace = useOptionalEditorWorkspace();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const [shapesOpen, setShapesOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!workspace) return;
    const { engine } = workspace;
    const offTool = engine.events.on("tool:changed", bump);
    const offScene = engine.events.on("scene:changed", bump);
    return () => {
      offTool();
      offScene();
    };
  }, [workspace]);

  useEffect(() => {
    if (!shapesOpen) return;
    const onDown = (event: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(event.target as Node)) {
        setShapesOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [shapesOpen]);

  if (!workspace) {
    return null;
  }

  const { engine } = workspace;
  const activeTool = engine.getRuntimeSnapshot().activeTool;
  const shapeToolActive = activeTool === "rect" || activeTool === "triangle" || activeTool === "ellipse";

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 justify-center px-2"
    >
      <div className="pointer-events-auto inline-flex items-center gap-1 rounded-2xl border border-violet-200/80 bg-white/95 px-2 py-2 shadow-xl shadow-violet-300/25 backdrop-blur-sm">
        {PRIMARY_DOCK_TOOLS.map(({ id, label, Icon }) => {
          const isActive = activeTool === id;
          return (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => {
                setShapesOpen(false);
                engine.setTool(id);
              }}
              className={
                isActive
                    ? "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500 bg-linear-to-br from-violet-600 to-fuchsia-500 text-white shadow-md"
                    : "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-violet-800 hover:bg-violet-100"
              }
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}

        <div className="relative mx-1 h-8 w-px bg-slate-200" aria-hidden />

        <div className="relative">
          <button
            type="button"
            title="Shapes"
            onClick={() => setShapesOpen((o) => !o)}
            className={
              shapeToolActive && !shapesOpen
                ? "inline-flex h-10 items-center gap-1 rounded-xl border border-blue-500 bg-blue-600 px-2 text-white"
                : shapesOpen
                  ? "inline-flex h-10 items-center gap-1 rounded-xl border border-slate-400 bg-slate-100 px-2 text-slate-900"
                  : "inline-flex h-10 items-center gap-1 rounded-xl border border-transparent px-2 text-slate-700 hover:bg-slate-100"
            }
          >
            <Shapes className="h-5 w-5" />
            <ChevronDown className={`h-4 w-4 transition-transform ${shapesOpen ? "rotate-180" : ""}`} />
          </button>

          {shapesOpen ? (
            <div
              role="menu"
              className="absolute bottom-full left-1/2 mb-2 min-w-44 -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            >
              {ENGINE_SHAPE_TOOLS.map((tool) => {
                const Icon = SHAPE_ICONS[tool.id] ?? Square;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    role="menuitem"
                    className={
                      isActive
                        ? "flex w-full items-center gap-2 bg-blue-50 px-3 py-2 text-left text-sm font-medium text-blue-800"
                        : "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                    }
                    onClick={() => {
                      engine.setTool(tool.id);
                      setShapesOpen(false);
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {tool.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
