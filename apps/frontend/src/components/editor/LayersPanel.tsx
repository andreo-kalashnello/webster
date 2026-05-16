import type { FC } from "react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { ChevronDown, Eye, EyeOff, Lock, Unlock } from "lucide-react";

import type { SceneNode } from "@/shared/lib/canvas-engine";
import { useOptionalEditorWorkspace } from "./editor-workspace-context";

type LayerEntry = {
  id: string;
  node: SceneNode;
  groupId: string | null;
};

type GroupEntry = {
  id: string;
  label: string;
  items: LayerEntry[];
};

type DisplayRow =
  | { type: "group"; group: GroupEntry }
  | { type: "layer"; layer: LayerEntry };

function getNodeLabel(node: SceneNode): string {
  if (node.data?.label && typeof node.data.label === "string" && node.data.label.trim()) {
    return node.data.label.trim();
  }
  if (node.type === "text") {
    const text = typeof node.data?.text === "string" ? node.data.text.trim() : "";
    return text ? `Text: ${text.slice(0, 24)}` : "Text";
  }
  return node.type.charAt(0).toUpperCase() + node.type.slice(1);
}

function getGroupLabel(groupId: string, items: LayerEntry[]): string {
  const custom = items.find((item) => typeof item.node.data?.groupLabel === "string")?.node.data?.groupLabel;
  if (custom && typeof custom === "string" && custom.trim()) {
    return custom.trim();
  }
  return `Group ${groupId.slice(0, 6)}`;
}

export const LayersPanel: FC = () => {
  const workspace = useOptionalEditorWorkspace();
  const [revision, bump] = useReducer((n: number) => n + 1, 0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropInfo, setDropInfo] = useState<{ targetId: string; position: "above" | "below" } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  useEffect(() => {
    if (!workspace) return;
    const { engine } = workspace;
    const offScene = engine.events.on("scene:changed", bump);
    const offSelection = engine.events.on("selection:changed", bump);
    return () => {
      offScene();
      offSelection();
    };
  }, [workspace]);

  const engine = workspace?.engine;
  const snapshot = engine?.getRuntimeSnapshot();
  const selectedIds = snapshot?.selectedNodeIds ?? [];

  const { rows, panelOrderIds } = useMemo(() => {
    if (!engine) {
      return { rows: [] as DisplayRow[], panelOrderIds: [] as string[] };
    }

    const scene = engine.getSerializableState();
    const entries: LayerEntry[] = scene.nodeOrder
      .map((id) => scene.nodes[id])
      .filter((node): node is SceneNode => Boolean(node))
      .map((node) => ({
        id: node.id,
        node,
        groupId: typeof node.data?.groupId === "string" ? node.data.groupId : null,
      }));

    const panelOrder = [...entries].reverse();
    const groupMap = new Map<string, LayerEntry[]>();
    const groupOrder: string[] = [];

    for (const entry of panelOrder) {
      if (!entry.groupId) {
        continue;
      }
      if (!groupMap.has(entry.groupId)) {
        groupMap.set(entry.groupId, []);
        groupOrder.push(entry.groupId);
      }
      groupMap.get(entry.groupId)?.push(entry);
    }

    const rows: DisplayRow[] = [];

    for (const entry of panelOrder) {
      if (entry.groupId && groupMap.has(entry.groupId)) {
        if (!rows.some((row) => row.type === "group" && row.group.id === entry.groupId)) {
          const groupItems = groupMap.get(entry.groupId) ?? [];
          rows.push({
            type: "group",
            group: {
              id: entry.groupId,
              label: getGroupLabel(entry.groupId, groupItems),
              items: groupItems,
            },
          });
        }
        continue;
      }
      rows.push({ type: "layer", layer: entry });
    }

    const panelOrderIds: string[] = [];
    for (const row of rows) {
      if (row.type === "layer") {
        panelOrderIds.push(row.layer.id);
        continue;
      }
      for (const item of row.group.items) {
        panelOrderIds.push(item.id);
      }
    }

    return { rows, panelOrderIds };
  }, [engine, revision]);

  if (!workspace || !engine) {
    return null;
  }

  const handleToggleVisibility = (node: SceneNode) => {
    const nextHidden = !node.data?.hidden;
    engine.updateNode(node.id, (prev) => ({
      ...prev,
      data: { ...(prev.data ?? {}), hidden: nextHidden },
    }));

    if (nextHidden) {
      engine.setSelection(selectedIds.filter((id) => id !== node.id));
    }
  };

  const handleToggleLock = (node: SceneNode) => {
    const nextLocked = !node.data?.locked;
    engine.updateNode(node.id, (prev) => ({
      ...prev,
      data: { ...(prev.data ?? {}), locked: nextLocked },
    }));

    if (nextLocked) {
      engine.setSelection(selectedIds.filter((id) => id !== node.id));
    }
  };

  const handleLayerClick = (event: React.MouseEvent, layerId: string) => {
    const scene = engine.getSerializableState();
    const node = scene.nodes[layerId];
    if (node?.data?.hidden) {
      return;
    }
    const panelIndex = panelOrderIds.indexOf(layerId);
    if (panelIndex === -1) {
      return;
    }

    if (event.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, panelIndex);
      const end = Math.max(lastClickedIndex, panelIndex);
      const range = panelOrderIds.slice(start, end + 1);
      engine.setSelection(range);
      return;
    }

    if (event.metaKey || event.ctrlKey) {
      if (selectedIds.includes(layerId)) {
        engine.setSelection(selectedIds.filter((id) => id !== layerId));
      } else {
        engine.setSelection([...selectedIds, layerId]);
      }
      setLastClickedIndex(panelIndex);
      return;
    }

    engine.setSelection([layerId]);
    setLastClickedIndex(panelIndex);
  };

  const handleDragStart = (event: React.DragEvent, layerId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", layerId);
    setDragId(layerId);
  };

  const handleDragOver = (event: React.DragEvent, targetId: string) => {
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? "above" : "below";
    setDropInfo({ targetId, position });
  };

  const handleDrop = (event: React.DragEvent, targetId: string) => {
    event.preventDefault();
    const dragged = event.dataTransfer.getData("text/plain") || dragId;
    if (!dragged || dragged === targetId) {
      setDropInfo(null);
      setDragId(null);
      return;
    }

    const panelIndex = panelOrderIds.indexOf(targetId);
    if (panelIndex === -1) {
      setDropInfo(null);
      setDragId(null);
      return;
    }

    const insertIndexPanel = dropInfo?.position === "below" ? panelIndex + 1 : panelIndex;
    const scene = engine.getSerializableState();
    const desiredIndex = scene.nodeOrder.length - 1 - insertIndexPanel;

    engine.reorderNode(dragged, desiredIndex);
    setDropInfo(null);
    setDragId(null);
  };

  const beginRename = (node: SceneNode) => {
    setEditingId(node.id);
    setEditValue(getNodeLabel(node));
  };

  const commitRename = (node: SceneNode) => {
    const label = editValue.trim();
    engine.updateNode(node.id, (prev) => ({
      ...prev,
      data: { ...(prev.data ?? {}), label },
    }));
    setEditingId(null);
  };

  const renderLayerRow = (entry: LayerEntry, nested = false) => {
    const node = entry.node;
    const isSelected = selectedIds.includes(entry.id);
    const isHidden = Boolean(node.data?.hidden);
    const isLocked = Boolean(node.data?.locked);
    const isDragging = dragId === entry.id;
    const isDropTarget = dropInfo?.targetId === entry.id;

    return (
      <div
        key={entry.id}
        draggable
        onDragStart={(event) => handleDragStart(event, entry.id)}
        onDragOver={(event) => handleDragOver(event, entry.id)}
        onDrop={(event) => handleDrop(event, entry.id)}
        onDragEnd={() => {
          setDropInfo(null);
          setDragId(null);
        }}
        className={
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition " +
          (isSelected ? "bg-blue-100 text-blue-900" : "hover:bg-slate-100") +
          (nested ? " ml-4" : "") +
          (isDragging ? " opacity-60" : "") +
          (isHidden ? " opacity-50" : "") +
          (isDropTarget ? (dropInfo?.position === "above" ? " border-t-2 border-blue-500" : " border-b-2 border-blue-500") : "")
        }
        onClick={(event) => handleLayerClick(event, entry.id)}
        onDoubleClick={() => beginRename(node)}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleToggleVisibility(node);
          }}
          className="rounded p-1 text-slate-600 hover:bg-white"
          title={isHidden ? "Show" : "Hide"}
        >
          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleToggleLock(node);
          }}
          className="rounded p-1 text-slate-600 hover:bg-white"
          title={isLocked ? "Unlock" : "Lock"}
        >
          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>

        <div className="min-w-0 flex-1">
          {editingId === entry.id ? (
            <input
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              onBlur={() => commitRename(node)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitRename(node);
                }
                if (event.key === "Escape") {
                  setEditingId(null);
                }
              }}
              className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              autoFocus
            />
          ) : (
            <div className="truncate text-slate-700">
              {getNodeLabel(node)}
              {isLocked ? " (locked)" : ""}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h3 className="text-sm font-semibold text-slate-900">Layers</h3>
        <span className="text-xs text-slate-500">{panelOrderIds.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {rows.length === 0 ? (
          <div className="px-2 py-4 text-xs text-slate-500">No layers yet.</div>
        ) : (
          rows.map((row) => {
            if (row.type === "layer") {
              return renderLayerRow(row.layer);
            }

            const isCollapsed = collapsedGroups[row.group.id];
            return (
              <div key={row.group.id} className="mb-2">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedGroups((prev) => ({
                      ...prev,
                      [row.group.id]: !prev[row.group.id],
                    }))
                  }
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <ChevronDown
                    size={14}
                    className={"transition-transform " + (isCollapsed ? "-rotate-90" : "")}
                  />
                  {row.group.label}
                </button>
                {!isCollapsed && row.group.items.map((item) => renderLayerRow(item, true))}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};