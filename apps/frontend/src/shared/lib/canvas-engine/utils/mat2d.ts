import type { Point, Rect, Transform } from "../core/types";

/**
 * 2D affine matrix in Canvas/DOMMatrix form:
 * [ a c e ]
 * [ b d f ]
 * [ 0 0 1 ]
 */
export type Mat2D = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
};

export function createIdentityMat2D(): Mat2D {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

export function multiplyMat2D(left: Mat2D, right: Mat2D): Mat2D {
  // (left * right)
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

export function invertMat2D(m: Mat2D): Mat2D | null {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-12) {
    return null;
  }
  const invDet = 1 / det;
  // n0: normalize -0 → 0 to keep numeric comparisons clean.
  const n0 = (n: number) => (n === 0 ? 0 : n);
  const a = n0(m.d * invDet);
  const b = n0(-m.b * invDet);
  const c = n0(-m.c * invDet);
  const d = n0(m.a * invDet);
  const e = n0(-(a * m.e + c * m.f));
  const f = n0(-(b * m.e + d * m.f));
  return { a, b, c, d, e, f };
}

export function applyMat2DToPoint(m: Mat2D, p: Point): Point {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
  };
}

export function translateMat2D(tx: number, ty: number): Mat2D {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

export function scaleMat2D(sx: number, sy: number): Mat2D {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

export function rotateMat2D(angleRad: number): Mat2D {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

export function composeMat2D(components: {
  translate?: Point;
  scale?: Point;
  rotateDeg?: number;
  pivot?: Point;
}): Mat2D {
  const translate = components.translate ?? { x: 0, y: 0 };
  const scale = components.scale ?? { x: 1, y: 1 };
  const rotateDeg = components.rotateDeg ?? 0;
  const pivot = components.pivot ?? { x: 0, y: 0 };

  const rotate = rotateMat2D((rotateDeg * Math.PI) / 180);

  // T(translate) * T(pivot) * R * S * T(-pivot)
  return multiplyMat2D(
    translateMat2D(translate.x, translate.y),
    multiplyMat2D(
      translateMat2D(pivot.x, pivot.y),
      multiplyMat2D(rotate, multiplyMat2D(scaleMat2D(scale.x, scale.y), translateMat2D(-pivot.x, -pivot.y))),
    ),
  );
}

/**
 * Decomposes matrix into translate + scale + rotate (no skew). Assumes matrix was composed
 * from T * (pivoted R*S), i.e. only rotate+scale with no skew. Pivot cannot be inferred.
 */
export function decomposeMat2D(m: Mat2D): { translate: Point; scale: Point; rotateDeg: number } {
  const translate = { x: m.e, y: m.f };

  // Extract scale as lengths of basis vectors.
  const scaleX = Math.hypot(m.a, m.b);
  const scaleY = Math.hypot(m.c, m.d);

  // Avoid division by zero.
  const nxA = scaleX > 1e-12 ? m.a / scaleX : 1;
  const nxB = scaleX > 1e-12 ? m.b / scaleX : 0;

  const rotateDeg = (Math.atan2(nxB, nxA) * 180) / Math.PI;
  return { translate, scale: { x: scaleX, y: scaleY }, rotateDeg };
}

export function getRectCorners(rect: Rect): [Point, Point, Point, Point] {
  const { x, y, width, height } = rect;
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

export function getAabbOfPoints(points: Point[]): Rect {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function getDefaultNodePivot(bounds: Rect): Point {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

export function composeNodeLocalToWorldMatrix(node: { bounds: Rect; transform: Transform }): Mat2D {
  const pivot = getDefaultNodePivot(node.bounds);
  return composeMat2D({
    translate: node.transform.translate,
    scale: node.transform.scale,
    rotateDeg: node.transform.rotate,
    pivot,
  });
}

export function getNodeWorldBounds(node: { bounds: Rect; transform: Transform }): Rect {
  const m = composeNodeLocalToWorldMatrix(node);
  const corners = getRectCorners(node.bounds).map((p) => applyMat2DToPoint(m, p));
  return getAabbOfPoints(corners);
}

export function isPointInConvexPolygon(point: Point, polygon: Point[]): boolean {
  // Works for convex polygon (quad) with consistent winding.
  let sign = 0;
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) < 1e-9) {
      continue;
    }
    const nextSign = cross > 0 ? 1 : -1;
    if (sign === 0) sign = nextSign;
    else if (sign !== nextSign) return false;
  }
  return true;
}

export function getNodeWorldHitbox(node: { bounds: Rect; transform: Transform }): Point[] {
  const m = composeNodeLocalToWorldMatrix(node);
  return getRectCorners(node.bounds).map((p) => applyMat2DToPoint(m, p));
}

export function isPointInNodeHitbox(point: Point, node: { bounds: Rect; transform: Transform }): boolean {
  return isPointInConvexPolygon(point, getNodeWorldHitbox(node));
}

export function rotateTransformAroundPivot(transform: Transform, pivotWorld: Point, nextRotateDeg: number): Transform {
  // Keep pivotWorld fixed while changing rotation (assumes pivot in local space = pivotWorld point).
  // We do: M' = T(pivot) * R(next) * S * T(-pivot) with same translate adjusted so pivotWorld stays.
  // In world: pivotWorld = M(pivotWorld). We adjust translate so that M'(pivotWorld) == pivotWorld.
  const pivot = pivotWorld;
  const base = composeMat2D({
    translate: { x: 0, y: 0 },
    scale: transform.scale,
    rotateDeg: nextRotateDeg,
    pivot,
  });

  const rotatedPivot = applyMat2DToPoint(base, pivot);
  const delta = { x: pivot.x - rotatedPivot.x, y: pivot.y - rotatedPivot.y };

  return {
    ...transform,
    rotate: nextRotateDeg,
    translate: { x: transform.translate.x + delta.x, y: transform.translate.y + delta.y },
  };
}

export function scaleTransformAroundAnchor(
  transform: Transform,
  anchorWorld: Point,
  nextScale: Point,
): Transform {
  const anchor = anchorWorld;
  const base = composeMat2D({
    translate: { x: 0, y: 0 },
    scale: nextScale,
    rotateDeg: transform.rotate,
    pivot: anchor,
  });
  const scaledAnchor = applyMat2DToPoint(base, anchor);
  const delta = { x: anchor.x - scaledAnchor.x, y: anchor.y - scaledAnchor.y };

  return {
    ...transform,
    scale: nextScale,
    translate: { x: transform.translate.x + delta.x, y: transform.translate.y + delta.y },
  };
}

