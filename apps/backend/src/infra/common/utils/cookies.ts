import type { ConfigService } from "@nestjs/config";
import type { CookieOptions, Response } from "express";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

function baseCookieOptions(config: ConfigService): CookieOptions {
  const isProduction = config.get("NODE_ENV") === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  accessToken: string,
  refreshToken: string,
  refreshDays: number,
) {
  const base = baseCookieOptions(config);
  const accessMaxAge = parseExpiresIn(config.get("JWT_ACCESS_EXPIRES_IN") ?? "15m");
  const refreshMaxAge = refreshDays * 24 * 60 * 60 * 1000;

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, { ...base, maxAge: accessMaxAge });
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, { ...base, maxAge: refreshMaxAge });
}

export function clearAuthCookies(res: Response, config: ConfigService) {
  const base = baseCookieOptions(config);
  res.clearCookie(ACCESS_TOKEN_COOKIE, base);
  res.clearCookie(REFRESH_TOKEN_COOKIE, base);
}

function parseExpiresIn(value: string): number {
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 15 * 60 * 1000;
  const num = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return num * (multipliers[unit] ?? 60_000);
}
