import { FC, useRef, useEffect } from "react";

import { useEditorStore } from "@/shared/stores/editor.store";

/**
 * Canvas area component - main drawing surface
 * Handles canvas rendering and responsive sizing
 */
export const CanvasArea: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toolbar } = useEditorStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <main className="relative flex-1 overflow-hidden bg-slate-50">
      {/* Grid background */}
      {toolbar.gridEnabled && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(0deg, #e2e8f0 1px, transparent 1px),
              linear-gradient(90deg, #e2e8f0 1px, transparent 1px)
            `,
            backgroundSize: `${toolbar.gridSize}px ${toolbar.gridSize}px`,
          }}
        />
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair"
        style={{
          transform: `scale(${toolbar.zoom / 100})`,
          transformOrigin: "0 0",
        }}
      />

      {/* Overlays for zoom info (optional) */}
      <div className="absolute bottom-4 left-4 rounded-lg bg-white/80 px-3 py-2 text-xs font-medium text-slate-900 shadow-sm backdrop-blur">
        Zoom: {toolbar.zoom}%
      </div>
    </main>
  );
};
