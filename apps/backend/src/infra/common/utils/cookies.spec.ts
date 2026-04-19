import type { ConfigService } from "@nestjs/config";
import type { Response } from "express";

import { clearAuthCookies, setAuthCookies } from "./cookies";

describe("cookies utils", () => {
  let res: Partial<Response>;
  let config: Partial<ConfigService>;

  beforeEach(() => {
    res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  describe("development mode", () => {
    beforeEach(() => {
      config = {
        get: jest.fn((key: string, def?: any) => {
          const map: Record<string, any> = {
            NODE_ENV: "development",
            JWT_ACCESS_EXPIRES_IN: "15m",
          };
          return map[key] ?? def;
        }),
      };
    });

    it("should set cookies with sameSite=lax in dev", () => {
      setAuthCookies(res as Response, config as ConfigService, "access-tok", "refresh-tok", 7);

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith(
        "access_token",
        "access-tok",
        expect.objectContaining({ httpOnly: true, secure: false, sameSite: "lax" }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "refresh-tok",
        expect.objectContaining({ httpOnly: true, secure: false, sameSite: "lax" }),
      );
    });

    it("should clear both cookies", () => {
      clearAuthCookies(res as Response, config as ConfigService);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.clearCookie).toHaveBeenCalledWith("access_token", expect.any(Object));
      expect(res.clearCookie).toHaveBeenCalledWith("refresh_token", expect.any(Object));
    });
  });

  describe("production mode", () => {
    beforeEach(() => {
      config = {
        get: jest.fn((key: string, def?: any) => {
          const map: Record<string, any> = {
            NODE_ENV: "production",
            JWT_ACCESS_EXPIRES_IN: "15m",
          };
          return map[key] ?? def;
        }),
      };
    });

    it("should set cookies with secure=true and sameSite=strict in prod", () => {
      setAuthCookies(res as Response, config as ConfigService, "at", "rt", 7);

      expect(res.cookie).toHaveBeenCalledWith(
        "access_token",
        "at",
        expect.objectContaining({ httpOnly: true, secure: true, sameSite: "strict" }),
      );
    });
  });

  describe("maxAge calculation", () => {
    it("should calculate correct refresh maxAge from days", () => {
      config = {
        get: jest.fn((key: string, def?: any) => {
          if (key === "JWT_ACCESS_EXPIRES_IN") return "15m";
          return def;
        }),
      };

      setAuthCookies(res as Response, config as ConfigService, "at", "rt", 7);

      const refreshCall = (res.cookie as jest.Mock).mock.calls.find(
        (c: any[]) => c[0] === "refresh_token",
      );
      expect(refreshCall[2].maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });
});
