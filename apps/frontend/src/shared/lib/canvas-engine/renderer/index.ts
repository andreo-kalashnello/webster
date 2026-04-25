import type { CanvasEngine } from "../core/create-engine";
import type { Point, Rect } from "../core/types";
import type { SceneNode } from "../scene/scene-node";

export type RenderMode = "full-redraw" | "dirty-rect";

export interface RenderStats {
  mode: RenderMode;
  frameTimeMs: number;
  renderedNodes: number;
}

export interface RendererViewport {
  width: number;
  height: number;
  dpr: number;
}

export interface RendererCamera {
  x: number;
  y: number;
  zoom: number;
}

interface RendererOptions {
  canvas: HTMLCanvasElement;
  engine: CanvasEngine;
  background?: string;
}

const DIRTY_NODE_THRESHOLD = 2;
const DIRTY_PADDING = 6;
const MIN_CAMERA_ZOOM = 0.25;
const MAX_CAMERA_ZOOM = 4;

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly engine: CanvasEngine;
  private readonly background: string;

  private ctx: CanvasRenderingContext2D;
  private dpr = Math.max(window.devicePixelRatio || 1, 1);
  private viewport: RendererViewport = { width: 0, height: 0, dpr: this.dpr };
  private resizeObserver: ResizeObserver;
  private unsubscribers: Array<() => void> = [];
  private framePending = false;
  private camera: RendererCamera = { x: 0, y: 0, zoom: 1 };

  private latestStats: RenderStats = { mode: "full-redraw", frameTimeMs: 0, renderedNodes: 0 };
  private lastNodeBounds = new Map<string, Rect>();

  constructor(options: RendererOptions) {
    this.canvas = options.canvas;
    this.engine = options.engine;
    this.background = options.background ?? "#f8fafc";

    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is not available");
    }
    this.ctx = context;

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeToHost();
      this.render("full-redraw");
    });
  }

  mount(): void {
    this.resizeToHost();
    this.resizeObserver.observe(this.canvas);

    this.unsubscribers.push(
      this.engine.events.on("scene:changed", () => this.scheduleRender()),
      this.engine.events.on("selection:changed", () => this.scheduleRender()),
      this.engine.events.on("tool:changed", () => this.scheduleRender()),
    );

    this.render("full-redraw");
  }

  destroy(): void {
    this.resizeObserver.disconnect();
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }

  getStats(): RenderStats {
    return this.latestStats;
  }

  getViewport(): RendererViewport {
    return this.viewport;
  }

  getCamera(): RendererCamera {
    return { ...this.camera };
  }

  setCamera(nextCamera: Partial<RendererCamera>): void {
    const nextZoom = clamp(nextCamera.zoom ?? this.camera.zoom, MIN_CAMERA_ZOOM, MAX_CAMERA_ZOOM);

    this.camera = {
      x: nextCamera.x ?? this.camera.x,
      y: nextCamera.y ?? this.camera.y,
      zoom: nextZoom,
    };

    this.render("full-redraw");
  }

  screenToWorld(point: Point): Point {
    return {
      x: (point.x - this.camera.x) / this.camera.zoom,
      y: (point.y - this.camera.y) / this.camera.zoom,
    };
  }

  render(preferredMode?: RenderMode): RenderStats {
    const startedAt = performance.now();

    const serializable = this.engine.getSerializableState();
    const runtime = this.engine.getRuntimeSnapshot();
    const nodes = this.getSortedNodes(serializable.nodes, serializable.nodeOrder);

    const mode = preferredMode ?? this.pickRenderMode(runtime.dirtyNodeIds, serializable.nodes);

    if (mode === "dirty-rect") {
      const dirtyBounds = this.collectDirtyBounds(runtime.dirtyNodeIds, serializable.nodes);
      if (!dirtyBounds) {
        return this.render("full-redraw");
      }

      this.clearCanvas(dirtyBounds);
      this.fillBackground(dirtyBounds);
      this.ctx.save();
      this.applyCameraTransform();
      this.drawNodes(nodes, dirtyBounds);
      this.drawSelectionOverlay(runtime.selectedNodeIds, serializable.nodes, dirtyBounds);
      this.ctx.restore();
    } else {
      this.clearCanvas();
      this.fillBackground();
      this.ctx.save();
      this.applyCameraTransform();
      this.drawNodes(nodes);
      this.drawSelectionOverlay(runtime.selectedNodeIds, serializable.nodes);
      this.ctx.restore();
    }

    this.lastNodeBounds.clear();
    for (const node of nodes) {
      this.lastNodeBounds.set(node.id, { ...node.bounds });
    }

    this.latestStats = {
      mode,
      renderedNodes: nodes.length,
      frameTimeMs: Number((performance.now() - startedAt).toFixed(2)),
    };

    return this.latestStats;
  }

  private scheduleRender(): void {
    if (this.framePending) {
      return;
    }
    this.framePending = true;

    requestAnimationFrame(() => {
      this.framePending = false;
      this.render();
    });
  }

  private resizeToHost(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(Math.floor(rect.width), 1);
    const height = Math.max(Math.floor(rect.height), 1);

    this.dpr = Math.max(window.devicePixelRatio || 1, 1);

    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.viewport = { width, height, dpr: this.dpr };
  }

  private pickRenderMode(dirtyNodeIds: string[], nodes: Record<string, SceneNode>): RenderMode {
    if (this.camera.zoom !== 1 || this.camera.x !== 0 || this.camera.y !== 0) {
      return "full-redraw";
    }

    if (dirtyNodeIds.length === 0 || dirtyNodeIds.length > DIRTY_NODE_THRESHOLD) {
      return "full-redraw";
    }

    for (const id of dirtyNodeIds) {
      if (!nodes[id] && !this.lastNodeBounds.has(id)) {
        return "full-redraw";
      }
    }

    return "dirty-rect";
  }

  private collectDirtyBounds(
    dirtyNodeIds: string[],
    nodes: Record<string, SceneNode>,
  ): Rect | null {
    if (dirtyNodeIds.length === 0) {
      return null;
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const id of dirtyNodeIds) {
      const nextBounds = nodes[id]?.bounds;
      const prevBounds = this.lastNodeBounds.get(id);
      const bounds = nextBounds ?? prevBounds;

      if (!bounds) {
        return null;
      }

      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    if (!Number.isFinite(minX)) {
      return null;
    }

    const x = Math.max(minX - DIRTY_PADDING, 0);
    const y = Math.max(minY - DIRTY_PADDING, 0);
    const width = Math.min(maxX - minX + DIRTY_PADDING * 2, this.viewport.width - x);
    const height = Math.min(maxY - minY + DIRTY_PADDING * 2, this.viewport.height - y);

    return { x, y, width, height };
  }

  private clearCanvas(region?: Rect): void {
    if (region) {
      this.ctx.clearRect(region.x, region.y, region.width, region.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
  }

  private fillBackground(region?: Rect): void {
    this.ctx.save();
    this.ctx.fillStyle = this.background;

    if (region) {
      this.ctx.fillRect(region.x, region.y, region.width, region.height);
    } else {
      this.ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
    }

    this.ctx.restore();
  }

  private drawNodes(nodes: SceneNode[], clipRegion?: Rect): void {
    if (clipRegion) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(clipRegion.x, clipRegion.y, clipRegion.width, clipRegion.height);
      this.ctx.clip();
    }

    for (const node of nodes) {
      this.drawNode(node);
    }

    if (clipRegion) {
      this.ctx.restore();
    }
  }

  private drawNode(node: SceneNode): void {
    const { x, y, width, height } = node.bounds;
    const fill = node.style.fill ?? "#60a5fa";
    const stroke = node.style.stroke ?? "#1e293b";
    const strokeWidth = node.style.strokeWidth ?? 1;
    const opacity = node.style.opacity ?? 1;

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.translate(node.transform.translate.x, node.transform.translate.y);

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate((node.transform.rotate * Math.PI) / 180);
    this.ctx.scale(node.transform.scale.x, node.transform.scale.y);
    this.ctx.translate(-centerX, -centerY);

    this.ctx.fillStyle = fill;
    this.ctx.strokeStyle = stroke;
    this.ctx.lineWidth = strokeWidth;

    switch (node.type) {
      case "triangle": {
        this.ctx.beginPath();
        this.ctx.moveTo(x + width / 2, y);
        this.ctx.lineTo(x + width, y + height);
        this.ctx.lineTo(x, y + height);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        break;
      }
      case "arrow": {
        const points = node.data?.points;
        if (points && points.length >= 2) {
          const start = points[0];
          const end = points[points.length - 1];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.hypot(dx, dy);

          if (length > 0.001) {
            const ux = dx / length;
            const uy = dy / length;
            const headLength = Math.max(10, Math.min(24, length * 0.24));
            const headWidth = headLength * 0.65;
            const baseX = end.x - ux * headLength;
            const baseY = end.y - uy * headLength;
            const perpX = -uy;
            const perpY = ux;

            this.ctx.beginPath();
            this.ctx.moveTo(start.x, start.y);
            this.ctx.lineTo(baseX, baseY);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(end.x, end.y);
            this.ctx.lineTo(baseX + perpX * (headWidth / 2), baseY + perpY * (headWidth / 2));
            this.ctx.lineTo(baseX - perpX * (headWidth / 2), baseY - perpY * (headWidth / 2));
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
          }
        } else {
          const head = Math.min(width, height) * 0.28;
          this.ctx.beginPath();
          this.ctx.moveTo(x, y + height / 2);
          this.ctx.lineTo(x + width - head, y + height / 2);
          this.ctx.moveTo(x + width - head, y + height / 2);
          this.ctx.lineTo(x + width - head, y + height / 2 - head / 2);
          this.ctx.moveTo(x + width - head, y + height / 2);
          this.ctx.lineTo(x + width - head, y + height / 2 + head / 2);
          this.ctx.lineTo(x + width, y + height / 2);
          this.ctx.lineTo(x + width - head, y + height / 2 - head / 2);
          this.ctx.stroke();
        }
        break;
      }
      case "text": {
        const fontSize = Math.max(8, Math.floor(height * 0.72));
        this.ctx.font = `${fontSize}px sans-serif`;
        this.ctx.textBaseline = "top";
        this.ctx.fillText(node.data?.text ?? "Text", x, y);
        break;
      }
      case "path": {
        const points = node.data?.points ?? [];
        if (points.length >= 2) {
          this.ctx.beginPath();
          this.ctx.moveTo(points[0].x, points[0].y);
          for (let index = 1; index < points.length; index += 1) {
            const point = points[index];
            this.ctx.lineTo(point.x, point.y);
          }
          this.ctx.stroke();
        }
        break;
      }
      default: {
        this.ctx.beginPath();
        this.ctx.rect(x, y, width, height);
        this.ctx.fill();
        this.ctx.stroke();
      }
    }

    this.ctx.restore();
  }

  private drawSelectionOverlay(
    selectedNodeIds: string[],
    nodes: Record<string, SceneNode>,
    clipRegion?: Rect,
  ): void {
    if (selectedNodeIds.length === 0) {
      return;
    }

    this.ctx.save();
    this.ctx.strokeStyle = "#0f172a";
    this.ctx.setLineDash([6, 4]);
    this.ctx.lineWidth = 1.5;

    if (clipRegion) {
      this.ctx.beginPath();
      this.ctx.rect(clipRegion.x, clipRegion.y, clipRegion.width, clipRegion.height);
      this.ctx.clip();
    }

    for (const id of selectedNodeIds) {
      const node = nodes[id];
      if (!node) {
        continue;
      }

      const { x, y, width, height } = node.bounds;
      this.ctx.strokeRect(x - 4, y - 4, width + 8, height + 8);
    }

    this.ctx.restore();
  }

  private getSortedNodes(nodesById: Record<string, SceneNode>, nodeOrder: string[]): SceneNode[] {
    const known = new Set(nodeOrder);

    const ordered = nodeOrder
      .map((id) => nodesById[id])
      .filter((node): node is SceneNode => Boolean(node));

    const extras = Object.values(nodesById).filter((node) => !known.has(node.id));
    return [...ordered, ...extras];
  }

  private applyCameraTransform(): void {
    this.ctx.translate(this.camera.x, this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}