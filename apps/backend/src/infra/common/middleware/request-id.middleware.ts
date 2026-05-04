import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";

/**
 * Middleware that attaches a unique request ID to every incoming request.
 * The ID is taken from the `x-request-id` header if provided by a proxy,
 * otherwise a new UUID v4 is generated.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existing = req.headers[REQUEST_ID_HEADER];
  const requestId = typeof existing === "string" && existing.length > 0 ? existing : randomUUID();

  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
}
