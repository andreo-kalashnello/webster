import { describe, it, expect } from "vitest";
import {
  createIdentityMat2D,
  multiplyMat2D,
  invertMat2D,
  applyMat2DToPoint,
  translateMat2D,
  scaleMat2D,
  rotateMat2D,
  composeMat2D,
  decomposeMat2D,
  getNodeWorldBounds,
  getDefaultNodePivot,
} from "./mat2d";
import { createIdentityTransform } from "../core/types";

const EPSILON = 1e-6;
const close = (a: number, b: number) => Math.abs(a - b) < EPSILON;

describe("createIdentityMat2D", () => {
  it("returns identity matrix", () => {
    const m = createIdentityMat2D();
    expect(m).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
  });
});

describe("multiplyMat2D", () => {
  it("identity * identity = identity", () => {
    const id = createIdentityMat2D();
    const result = multiplyMat2D(id, id);
    expect(result).toEqual(id);
  });

  it("translate * translate = combined translate", () => {
    const t1 = translateMat2D(10, 20);
    const t2 = translateMat2D(5, 7);
    const result = multiplyMat2D(t1, t2);
    expect(result.e).toBe(15);
    expect(result.f).toBe(27);
  });

  it("scale * scale = combined scale", () => {
    const s1 = scaleMat2D(2, 3);
    const s2 = scaleMat2D(4, 5);
    const result = multiplyMat2D(s1, s2);
    expect(result.a).toBe(8);
    expect(result.d).toBe(15);
  });
});

describe("invertMat2D", () => {
  it("identity inverse is identity", () => {
    const id = createIdentityMat2D();
    const inv = invertMat2D(id);
    expect(inv).toEqual(id);
  });

  it("translate inverse undoes translate", () => {
    const t = translateMat2D(10, 20);
    const inv = invertMat2D(t);
    expect(inv).not.toBeNull();
    const p = applyMat2DToPoint(t, { x: 0, y: 0 });
    const back = applyMat2DToPoint(inv!, p);
    expect(close(back.x, 0)).toBe(true);
    expect(close(back.y, 0)).toBe(true);
  });

  it("returns null for degenerate matrix", () => {
    const m = { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 };
    expect(invertMat2D(m)).toBeNull();
  });
});

describe("applyMat2DToPoint", () => {
  it("applies identity — point unchanged", () => {
    const id = createIdentityMat2D();
    const p = applyMat2DToPoint(id, { x: 42, y: -7 });
    expect(p).toEqual({ x: 42, y: -7 });
  });

  it("applies translate", () => {
    const t = translateMat2D(5, -3);
    const p = applyMat2DToPoint(t, { x: 10, y: 10 });
    expect(p).toEqual({ x: 15, y: 7 });
  });

  it("applies scale", () => {
    const s = scaleMat2D(2, 0.5);
    const p = applyMat2DToPoint(s, { x: 4, y: 8 });
    expect(p).toEqual({ x: 8, y: 4 });
  });
});

describe("rotateMat2D", () => {
  it("rotate 0 = identity", () => {
    const m = rotateMat2D(0);
    expect(close(m.a, 1)).toBe(true);
    expect(close(m.b, 0)).toBe(true);
    expect(close(m.c, 0)).toBe(true);
    expect(close(m.d, 1)).toBe(true);
  });

  it("rotate 90deg rotates point correctly", () => {
    const m = rotateMat2D(Math.PI / 2);
    const p = applyMat2DToPoint(m, { x: 1, y: 0 });
    expect(close(p.x, 0)).toBe(true);
    expect(close(p.y, 1)).toBe(true);
  });
});

describe("composeMat2D", () => {
  it("no-ops with identity components", () => {
    const m = composeMat2D({});
    const p = applyMat2DToPoint(m, { x: 5, y: 5 });
    expect(close(p.x, 5)).toBe(true);
    expect(close(p.y, 5)).toBe(true);
  });

  it("translate component shifts point", () => {
    const m = composeMat2D({ translate: { x: 10, y: 0 } });
    const p = applyMat2DToPoint(m, { x: 0, y: 0 });
    expect(close(p.x, 10)).toBe(true);
  });

  it("pivot-based rotate keeps pivot fixed", () => {
    const pivot = { x: 100, y: 100 };
    const m = composeMat2D({ rotateDeg: 90, pivot });
    const pivotOut = applyMat2DToPoint(m, pivot);
    expect(close(pivotOut.x, pivot.x)).toBe(true);
    expect(close(pivotOut.y, pivot.y)).toBe(true);
  });
});

describe("decomposeMat2D", () => {
  it("round-trips translate+scale+rotate through compose then decompose", () => {
    const translate = { x: 30, y: -10 };
    const scale = { x: 2, y: 1.5 };
    const rotateDeg = 45;
    const m = composeMat2D({ translate, scale, rotateDeg });
    const d = decomposeMat2D(m);
    expect(close(d.translate.x, translate.x)).toBe(true);
    expect(close(d.translate.y, translate.y)).toBe(true);
    expect(close(d.scale.x, scale.x)).toBe(true);
    expect(close(d.scale.y, scale.y)).toBe(true);
    expect(close(d.rotateDeg, rotateDeg)).toBe(true);
  });
});

describe("getNodeWorldBounds", () => {
  it("identity transform — world bounds equals node bounds", () => {
    const node = {
      bounds: { x: 10, y: 20, width: 100, height: 50 },
      transform: createIdentityTransform(),
    };
    const wb = getNodeWorldBounds(node);
    expect(close(wb.x, 10)).toBe(true);
    expect(close(wb.y, 20)).toBe(true);
    expect(close(wb.width, 100)).toBe(true);
    expect(close(wb.height, 50)).toBe(true);
  });

  it("90deg rotation expands bounding box", () => {
    const node = {
      bounds: { x: 0, y: 0, width: 100, height: 50 },
      transform: { ...createIdentityTransform(), rotate: 90 },
    };
    const wb = getNodeWorldBounds(node);
    // After 90deg rotation, width ≈ original height and height ≈ original width.
    expect(close(wb.width, 50)).toBe(true);
    expect(close(wb.height, 100)).toBe(true);
  });
});

describe("getDefaultNodePivot", () => {
  it("returns center of bounds", () => {
    const bounds = { x: 10, y: 20, width: 80, height: 60 };
    const pivot = getDefaultNodePivot(bounds);
    expect(pivot).toEqual({ x: 50, y: 50 });
  });
});
