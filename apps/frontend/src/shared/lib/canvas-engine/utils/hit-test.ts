import type { Point, Rect } from "../core/types";
import type { SceneNode } from "../scene/scene-node";
import {
  composeNodeLocalToWorldMatrix,
  getDefaultNodePivot,
  getNodeWorldBounds,
  invertMat2D,
  applyMat2DToPoint,
} from "./mat2d";

function isPointInRectLocal(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function sign(p1: Point, p2: Point, p3: Point): number {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

function isPointInTriangle(point: Point, a: Point, b: Point, c: Point): boolean {
  const d1 = sign(point, a, b);
  const d2 = sign(point, b, c);
  const d3 = sign(point, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const abLen2 = abx * abx + aby * aby;
  if (abLen2 < 1e-9) {
    return Math.hypot(apx, apy);
  }
  const t = (apx * abx + apy * aby) / abLen2;
  const clamped = Math.max(0, Math.min(1, t));
  const cx = a.x + abx * clamped;
  const cy = a.y + aby * clamped;
  return Math.hypot(p.x - cx, p.y - cy);
}

export function worldPointToNodeLocalPoint(node: SceneNode, worldPoint: Point): Point | null {
  const m = composeNodeLocalToWorldMatrix(node);
  const inv = invertMat2D(m);
  if (!inv) {
    return null;
  }
  return applyMat2DToPoint(inv, worldPoint);
}

function isPointInEllipseLocal(point: Point, rect: Rect): boolean {
  const { x, y, width, height } = rect;
  if (width <= 0 || height <= 0) {
    return false;
  }
  const cx = x + width / 2;
  const cy = y + height / 2;
  const rx = width / 2;
  const ry = height / 2;
  const nx = (point.x - cx) / rx;
  const ny = (point.y - cy) / ry;
  return nx * nx + ny * ny <= 1 + 1e-9;
}

export function hitTestNodeAtWorldPoint(node: SceneNode, worldPoint: Point): boolean {
  if (node.data?.hidden || node.data?.locked) {
    return false;
  }
  // Fast reject via world AABB.
  const worldBounds = getNodeWorldBounds(node);
  if (
    worldPoint.x < worldBounds.x ||
    worldPoint.x > worldBounds.x + worldBounds.width ||
    worldPoint.y < worldBounds.y ||
    worldPoint.y > worldBounds.y + worldBounds.height
  ) {
    return false;
  }

  const localPoint = worldPointToNodeLocalPoint(node, worldPoint);
  if (!localPoint) {
    return false;
  }

  const localBounds = node.bounds;

  switch (node.type) {
    case "ellipse": {
      return isPointInEllipseLocal(localPoint, localBounds);
    }
    case "rect":
    case "image":
    case "text": {
      return isPointInRectLocal(localPoint, localBounds);
    }
    case "triangle": {
      const { x, y, width, height } = localBounds;
      const a = { x: x + width / 2, y };
      const b = { x: x + width, y: y + height };
      const c = { x, y: y + height };
      return isPointInTriangle(localPoint, a, b, c);
    }
    case "arrow":
    case "path": {
      const points = node.data?.points;
      if (!points || points.length < 2) {
        // Fallback to bounds for degenerate arrow/path.
        return isPointInRectLocal(localPoint, localBounds);
      }

      const strokeWidth = node.style.strokeWidth ?? 2;
      const hitRadius = Math.max(4, strokeWidth * 1.5);

      for (let i = 0; i < points.length - 1; i += 1) {
        const a = points[i];
        const b = points[i + 1];
        if (distancePointToSegment(localPoint, a, b) <= hitRadius) {
          return true;
        }
      }
      return false;
    }
    default: {
      // Unknown node type: treat as rect.
      return isPointInRectLocal(localPoint, localBounds);
    }
  }
}

export function pickTopMostNodeAtWorldPoint(
  scene: { nodeOrder: string[]; nodes: Record<string, SceneNode> },
  worldPoint: Point,
): string | null {
  for (let index = scene.nodeOrder.length - 1; index >= 0; index -= 1) {
    const nodeId = scene.nodeOrder[index];
    const node = scene.nodes[nodeId];
    if (!node) continue;
    if (node.data?.hidden || node.data?.locked) continue;
    if (hitTestNodeAtWorldPoint(node, worldPoint)) {
      return nodeId;
    }
  }
  return null;
}

export function unionRects(rects: Rect[]): Rect | null {
  if (rects.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function getSelectionWorldBounds(
  scene: { nodes: Record<string, SceneNode> },
  nodeIds: string[],
): Rect | null {
  const rects: Rect[] = [];
  for (const id of nodeIds) {
    const node = scene.nodes[id];
    if (!node) continue;
    rects.push(getNodeWorldBounds(node));
  }
  return unionRects(rects);
}

export function getNodeDefaultPivotWorld(node: SceneNode): Point {
  // In current engine pivot is rect center in local space, before transform.
  // World pivot is local pivot passed through local->world matrix.
  const localPivot = getDefaultNodePivot(node.bounds);
  const m = composeNodeLocalToWorldMatrix(node);
  return applyMat2DToPoint(m, localPivot);
}

