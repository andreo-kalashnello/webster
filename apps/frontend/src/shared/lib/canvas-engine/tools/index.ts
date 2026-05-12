import type { ToolName } from "../core/types";

export interface ToolDescriptor {
  id: ToolName;
  label: string;
}

export const ENGINE_TOOLS: ToolDescriptor[] = [
  { id: "select", label: "Select" },
  { id: "text", label: "Text" },
  { id: "pencil", label: "Pencil" },
  { id: "rect", label: "Rect" },
  { id: "triangle", label: "Triangle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "arrow", label: "Arrow" },
  { id: "image", label: "Image" },
];

/** Tools shown under the “Shapes” menu in the editor dock. */
export const ENGINE_SHAPE_TOOLS: ToolDescriptor[] = [
  { id: "rect", label: "Rectangle" },
  { id: "triangle", label: "Triangle" },
  { id: "ellipse", label: "Ellipse" },
];