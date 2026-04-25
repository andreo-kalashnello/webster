import { FC } from "react";
import { ZoomIn, ZoomOut, Grid3x3, Plus, Minus } from "lucide-react";

import { useEditorStore } from "@/shared/stores/editor.store";

const TOOLS = [
  { id: "select", label: "Select", icon: "👆", hotkey: "V" },
  { id: "rect", label: "Rectangle", icon: "📦", hotkey: "R" },
  { id: "triangle", label: "Triangle", icon: "🔺", hotkey: "T" },
  { id: "circle", label: "Circle", icon: "⭕", hotkey: "C" },
  { id: "text", label: "Text", icon: "📝", hotkey: "A" },
  { id: "pencil", label: "Pencil", icon: "✏️", hotkey: "P" },
  { id: "arrow", label: "Arrow", icon: "➡️", hotkey: "-" },
  { id: "image", label: "Image", icon: "🖼️", hotkey: "-" },
] as const;

export const EditorToolbar: FC = () => {
  const { toolbar, setActiveTool, setZoom, toggleGrid } = useEditorStore();

  const handleZoomIn = () => setZoom(toolbar.zoom + 10);
  const handleZoomOut = () => setZoom(toolbar.zoom - 10);
  const handleZoomReset = () => setZoom(100);

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 overflow-x-auto px-4 py-3">
        {/* Tool Selection */}
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id as any)}
              className={`group relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                toolbar.activeTool === tool.id
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-slate-100 text-slate-700"
              }`}
              title={`${tool.label} (${tool.hotkey})`}
            >
              <span className="text-lg">{tool.icon}</span>
              <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {tool.label}
              </span>
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
          <button
            onClick={handleZoomOut}
            className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
            title="Zoom Out (Ctrl + Mouse Wheel)"
          >
            <ZoomOut size={18} className="text-slate-700" />
          </button>
          <button
            onClick={handleZoomReset}
            className="min-w-14 rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 transition-colors text-slate-700"
          >
            {toolbar.zoom}%
          </button>
          <button
            onClick={handleZoomIn}
            className="rounded-lg p-2 hover:bg-slate-100 transition-colors"
            title="Zoom In (Ctrl + Mouse Wheel)"
          >
            <ZoomIn size={18} className="text-slate-700" />
          </button>
        </div>

        {/* Grid Toggle */}
        <button
          onClick={toggleGrid}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
            toolbar.gridEnabled
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-slate-100 text-slate-700"
          }`}
          title="Toggle Grid (Ctrl + G)"
        >
          <Grid3x3 size={18} />
          <span className="text-sm font-medium">Grid</span>
        </button>
      </div>
    </header>
  );
};