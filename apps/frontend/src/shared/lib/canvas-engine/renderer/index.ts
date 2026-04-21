export type RenderMode = "full-redraw" | "dirty-rect";

export interface RenderStats {
  mode: RenderMode;
  frameTimeMs: number;
  renderedNodes: number;
}