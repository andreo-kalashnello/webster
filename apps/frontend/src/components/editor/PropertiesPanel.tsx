import type { FC } from "react";
import { useEffect, useMemo, useReducer } from "react";
import { X, ChevronDown } from "lucide-react";

import type { SceneNode } from "@/shared/lib/canvas-engine";
import { ColorInput, NumberInput, SelectInput, SliderInput } from "@/components/ui/controls";
import { useOptionalEditorWorkspace } from "./editor-workspace-context";

type PanelProps = Record<string, unknown>;

function nodeToPanel(node: SceneNode): PanelProps {
  const base = {
    x: node.bounds.x,
    y: node.bounds.y,
    width: node.bounds.width,
    height: node.bounds.height,
    rotation: node.transform.rotate,
    fill: node.style.fill ?? "#94a3b8",
    stroke: node.style.stroke ?? "#0f172a",
    strokeWidth: node.style.strokeWidth ?? 1,
    opacity: node.style.opacity ?? 1,
  };
  if (node.type === "text") {
    return {
      ...base,
      fontSize: Math.max(8, Math.floor(node.bounds.height * 0.72)),
      fontFamily: "sans-serif",
      textColor: node.style.fill ?? "#0f172a",
    };
  }
  return base;
}

function readFiniteNumberFromInput(value: string): number | null {
  if (value === "" || value === "-" || value === "." || value === "-.") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const PropertiesPanel: FC = () => {
  const workspace = useOptionalEditorWorkspace();
  const [panelRev, bumpPanel] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!workspace) return;
    const { engine } = workspace;
    const offSel = engine.events.on("selection:changed", bumpPanel);
    const offScene = engine.events.on("scene:changed", bumpPanel);
    return () => {
      offSel();
      offScene();
    };
  }, [workspace]);

  const snapshot = workspace?.engine.getRuntimeSnapshot();
  const selectedIds = snapshot?.selectedNodeIds ?? [];
  const engine = workspace?.engine;

  const singleId = selectedIds.length === 1 ? selectedIds[0] : null;
  const node = useMemo(() => {
    if (!engine || !singleId) return null;
    return engine.getSerializableState().nodes[singleId] ?? null;
  }, [engine, singleId, panelRev]);

  if (!workspace || !engine) {
    return null;
  }

  if (selectedIds.length === 0) {
    return null;
  }

  if (selectedIds.length > 1) {
    return (
      <aside className="z-40 flex w-full flex-col overflow-hidden border-l border-violet-200/80 bg-white/95 shadow-lg backdrop-blur-md sm:relative sm:top-0 sm:h-full sm:w-80">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-slate-900">{selectedIds.length} objects selected</h3>
          <button
            type="button"
            onClick={() => engine.setSelection([])}
            className="rounded-lg p-2 transition-colors hover:bg-slate-100"
            title="Clear selection"
          >
            <X size={18} className="text-slate-700" />
          </button>
        </div>
        <p className="px-4 py-4 text-sm text-slate-600">Edit properties for one object at a time.</p>
      </aside>
    );
  }

  if (!singleId || !node) {
    return null;
  }

  if (node.data?.locked) {
    return (
      <aside className="z-40 flex w-full flex-col overflow-hidden border-l border-slate-200 bg-white shadow-lg sm:relative sm:top-0 sm:h-full sm:w-80">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="font-semibold text-slate-900">Properties</h3>
          <button
            type="button"
            onClick={() => engine.setSelection([])}
            className="rounded-lg p-2 transition-colors hover:bg-slate-100"
            title="Close (Esc)"
          >
            <X size={18} className="text-slate-700" />
          </button>
        </div>
        <div className="flex-1 px-4 py-4 text-sm text-slate-600">
          This layer is locked. Unlock it in the Layers panel to edit properties.
        </div>
      </aside>
    );
  }

  const props = nodeToPanel(node);

  const updateBounds = (patch: Partial<{ x: number; y: number; width: number; height: number }>) => {
    engine.updateNode(singleId, (prev) => ({
      ...prev,
      bounds: {
        ...prev.bounds,
        ...patch,
      },
    }));
  };

  const updateStyle = (patch: Partial<{ fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }>) => {
    engine.updateNode(singleId, (prev) => ({
      ...prev,
      style: {
        ...prev.style,
        ...patch,
      },
    }));
  };

  const updateRotation = (rotate: number) => {
    engine.updateNode(singleId, (prev) => ({
      ...prev,
      transform: {
        ...prev.transform,
        rotate,
      },
    }));
  };

  const assignImageSrc = (src: string) => {
    engine.updateNode(singleId, (prev) => ({
      ...prev,
      data: { ...(prev.data ?? {}), src },
    }));
  };

  return (
    <aside className="z-40 flex w-full flex-col overflow-hidden border-l border-violet-200/80 bg-white/95 shadow-lg backdrop-blur-md sm:relative sm:top-0 sm:h-full sm:w-80">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-900">Properties</h3>
        <button
          type="button"
          onClick={() => engine.setSelection([])}
          className="rounded-lg p-2 transition-colors hover:bg-slate-100"
          title="Close (Esc)"
        >
          <X size={18} className="text-slate-700" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
        <section>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-600">
            <ChevronDown size={14} />
            Position &amp; size
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="X"
                value={props.x as number}
                step="any"
                onChange={(e) => {
                  const n = readFiniteNumberFromInput(e.target.value);
                  if (n === null) return;
                  updateBounds({ x: n });
                }}
                unit="px"
              />
              <NumberInput
                label="Y"
                value={props.y as number}
                step="any"
                onChange={(e) => {
                  const n = readFiniteNumberFromInput(e.target.value);
                  if (n === null) return;
                  updateBounds({ y: n });
                }}
                unit="px"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Width"
                value={props.width as number}
                step="any"
                onChange={(e) => {
                  const n = readFiniteNumberFromInput(e.target.value);
                  if (n === null) return;
                  updateBounds({ width: Math.max(1, n) });
                }}
                min={1}
                unit="px"
              />
              <NumberInput
                label="Height"
                value={props.height as number}
                step="any"
                onChange={(e) => {
                  const n = readFiniteNumberFromInput(e.target.value);
                  if (n === null) return;
                  updateBounds({ height: Math.max(1, n) });
                }}
                min={1}
                unit="px"
              />
            </div>
            <NumberInput
              label="Rotation"
              value={props.rotation as number}
              step="any"
              onChange={(e) => {
                const n = readFiniteNumberFromInput(e.target.value);
                if (n === null) return;
                updateRotation(n);
              }}
              unit="°"
            />
          </div>
        </section>

        <section>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-600">
            <ChevronDown size={14} />
            Fill &amp; stroke
          </h4>
          <div className="space-y-3">
            <ColorInput
              label="Fill"
              value={props.fill as string}
              onChange={(e) => updateStyle({ fill: e.target.value })}
            />
            <ColorInput
              label="Stroke"
              value={props.stroke as string}
              onChange={(e) => updateStyle({ stroke: e.target.value })}
            />
            <NumberInput
              label="Stroke width"
              value={props.strokeWidth as number}
              step={0.5}
              min={0}
              onChange={(e) => {
                const n = readFiniteNumberFromInput(e.target.value);
                if (n === null) return;
                updateStyle({ strokeWidth: Math.max(0, n) });
              }}
              unit="px"
            />
          </div>
        </section>

        {node.type === "image" ? (
          <section>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-600">
              <ChevronDown size={14} />
              Image
            </h4>
            <div className="space-y-3">
              <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-700">
                Upload file
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-slate-800"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file || !file.type.startsWith("image/")) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result;
                      if (typeof result === "string") {
                        assignImageSrc(result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <p className="text-xs text-slate-500">Or drop an image file onto the canvas (replaces this node if selected).</p>
            </div>
          </section>
        ) : null}

        <section>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-600">
            <ChevronDown size={14} />
            Transparency
          </h4>
          <SliderInput
            label="Opacity"
            min={0}
            max={100}
            value={Math.round((props.opacity as number) * 100)}
            onChange={(e) => updateStyle({ opacity: Number(e.target.value) / 100 })}
            unit="%"
          />
        </section>

        {node.type === "text" ? (
          <section>
            <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-600">
              <ChevronDown size={14} />
              Text
            </h4>
            <div className="space-y-3">
              <SelectInput
                label="Font (preview)"
                value={(props.fontFamily as string) ?? "sans-serif"}
                onChange={() => undefined}
                options={[
                  { value: "sans-serif", label: "Sans-serif" },
                  { value: "serif", label: "Serif" },
                  { value: "monospace", label: "Monospace" },
                ]}
              />
              <NumberInput
                label="Font size"
                value={props.fontSize as number}
                step={1}
                onChange={(e) => {
                  const n = readFiniteNumberFromInput(e.target.value);
                  if (n === null) return;
                  const fs = Math.max(8, n);
                  engine.updateNode(singleId, (prev) => ({
                    ...prev,
                    bounds: {
                      ...prev.bounds,
                      height: Math.max(fs + 4, prev.bounds.height),
                    },
                  }));
                }}
                min={8}
                max={128}
                unit="px"
              />
              <ColorInput
                label="Text color"
                value={props.textColor as string}
                onChange={(e) => updateStyle({ fill: e.target.value })}
              />
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
};
