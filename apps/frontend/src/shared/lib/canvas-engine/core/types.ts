export type NodeId = string;
export type LayerId = string;

export type ToolName = "select" | "text" | "pencil" | "rect" | "triangle" | "arrow" | "image";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  translate: Point;
  scale: Point;
  rotate: number;
}

export const DEFAULT_LAYER_ID: LayerId = "layer-default";

export function createIdentityTransform(): Transform {
  return {
    translate: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotate: 0,
  };
}