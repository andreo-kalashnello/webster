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
  { id: "arrow", label: "Arrow" },
  { id: "image", label: "Image" },
];