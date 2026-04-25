import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";

export interface ObjectProperties {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontSize?: number;
  fontFamily?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontUnderline?: boolean;
  textColor?: string;
}

export interface ToolbarState {
  activeTool: "select" | "rect" | "triangle" | "circle" | "text" | "pencil" | "arrow" | "image";
  zoom: number;
  gridEnabled: boolean;
  gridSize: number;
}

export interface PropertiesPanelState {
  selectedNodeIds: string[];
  properties: Partial<ObjectProperties> | null;
  isOpen: boolean;
}

export interface EditorStoreState {
  // Toolbar
  toolbar: ToolbarState;
  setActiveTool: (tool: ToolbarState["activeTool"]) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;

  // Properties Panel
  propertiesPanel: PropertiesPanelState;
  selectNodes: (nodeIds: string[]) => void;
  updateProperties: (updates: Partial<ObjectProperties>) => void;
  clearSelection: () => void;
  togglePropertiesPanel: () => void;
}

export const useEditorStore = create<EditorStoreState>()(
  devtools(
    subscribeWithSelector((set) => ({
      // Toolbar initial state
      toolbar: {
        activeTool: "select",
        zoom: 100,
        gridEnabled: false,
        gridSize: 20,
      },

      // Toolbar actions
      setActiveTool: (tool) =>
        set((state) => ({
          toolbar: { ...state.toolbar, activeTool: tool },
        })),

      setZoom: (zoom) =>
        set((state) => ({
          toolbar: { ...state.toolbar, zoom: Math.max(10, Math.min(500, zoom)) },
        })),

      toggleGrid: () =>
        set((state) => ({
          toolbar: { ...state.toolbar, gridEnabled: !state.toolbar.gridEnabled },
        })),

      setGridSize: (size) =>
        set((state) => ({
          toolbar: { ...state.toolbar, gridSize: Math.max(5, size) },
        })),

      // Properties panel initial state
      propertiesPanel: {
        selectedNodeIds: [],
        properties: null,
        isOpen: false,
      },

      // Properties panel actions
      selectNodes: (nodeIds) =>
        set(() => ({
          propertiesPanel: {
            selectedNodeIds: nodeIds,
            properties: nodeIds.length > 0 ? {} : null,
            isOpen: nodeIds.length > 0,
          },
        })),

      updateProperties: (updates) =>
        set((state) => ({
          propertiesPanel: {
            ...state.propertiesPanel,
            properties: state.propertiesPanel.properties
              ? { ...state.propertiesPanel.properties, ...updates }
              : updates,
          },
        })),

      clearSelection: () =>
        set(() => ({
          propertiesPanel: {
            selectedNodeIds: [],
            properties: null,
            isOpen: false,
          },
        })),

      togglePropertiesPanel: () =>
        set((state) => ({
          propertiesPanel: {
            ...state.propertiesPanel,
            isOpen: !state.propertiesPanel.isOpen,
          },
        })),
    })),
    { name: "EditorStore" }
  )
);