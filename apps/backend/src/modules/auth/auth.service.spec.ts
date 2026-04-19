import {
    BadRequestException,
    ConflictException,
    UnauthorizedException,
} from "@nestjs/common";

import type { MailService } from "../../infra/mail/mail.service";
import type { OAuthService } from "../../infra/oauth/oauth.service";
import type { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

// ─── Helpers ──────────────────────────────────────────

const TEST_SECRET = "test-jwt-secret";

const mockUser = (overrides: Partial<any> = {}) => ({
  id: "user-id-1",
  email: "test@example.com",
  passwordHash: "hashed-password",
  firstName: "John",
  lastName: "Doe",
  isEmailVerified: false,
  isTwoFactorEnabled: false,
  twoFactorSecret: undefined as string | undefined,
  ...overrides,
});

// ─── Mocks ────────────────────────────────────────────

jest.mock("../../infra/common/utils/hashing", () => ({
  hash: jest.fn().mockResolvedValue("hashed-value"),
  verify: jest.fn().mockResolvedValue(true),
}));

jest.mock("otplib", () => ({
  generateSecret: jest.fn().mockReturnValue("TOTP_SECRET"),
  generateURI: jest.fn().mockReturnValue("otpauth://totp/test"),
  verifySync: jest.fn().mockReturnValue({ valid: true }),
}));

jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,qrcode"),
}));

import { verifySync as otpVerifySync } from "otplib";
import { hash, verify as verifyHash } from "../../infra/common/utils/hashing";

const _mockHashFn = hash as jest.MockedFunction<typeof hash>;
const mockVerifyFn = verifyHash as jest.MockedFunction<typeof verifyHash>;
const mockOtpVerify = otpVerifySync as jest.MockedFunction<typeof otpVerifySync>;

// ─── Test suite ───────────────────────────────────────

describe("AuthService", () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: Partial<Record<"sign" | "verify", jest.Mock>>;
  let mailService: Partial<Record<keyof MailService, jest.Mock>>;
  let oauthService: Partial<Record<keyof OAuthService, jest.Mock>>;
  let refreshTokenModel: Record<string, jest.Mock>;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      verifyEmail: jest.fn(),
      setPassword: jest.fn(),
      setTwoFactorSecret: jest.fn(),
      enableTwoFactor: jest.fn(),
      disableTwoFactor: jest.fn(),
      findByOAuth: jest.fn(),
      createOAuthUser: jest.fn(),
      linkOAuth: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue("jwt-token"),
      verify: jest.fn().mockReturnValue({ sub: "user-id-1", type: "password-reset" }),
    };

    mailService = {
      send: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendMagicLink: jest.fn().mockResolvedValue(undefined),
    };

    oauthService = {
      getUserProfile: jest.fn(),
    };

    refreshTokenModel = {
      create: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    const configService = {
      get: jest.fn((key: string, def?: any) => {
        const map: Record<string, any> = {
          JWT_REFRESH_DAYS: 7,
          JWT_ACCESS_EXPIRES_IN: "15m",
          APP_NAME: "Webster",
        };
        return map[key] ?? def;
      }),
      getOrThrow: jest.fn().mockReturnValue(TEST_SECRET),
    };

    authService = new AuthService(
      usersService as any,
      jwtService as any,
      configService as any,
      mailService as any,
      oauthService as any,
      refreshTokenModel as any,
    );
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Register ─────────────────────────────────────

  describe("register", () => {
    const input = {
      email: "new@example.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
    };

    it("should register a new user and return tokens", async () => {
      usersService.findByEmail?.mockResolvedValue(null);
      usersService.create?.mockResolvedValue(mockUser({ id: "new-id", email: input.email }));

      const result = await authService.register(input);

      expect(usersService.findByEmail).toHaveBeenCalledWith(input.email);
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: input.email, passwordHash: "hashed-value" }),
      );
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("should throw ConflictException if email exists", async () => {
      usersService.findByEmail?.mockResolvedValue(mockUser());

      await expect(authService.register(input)).rejects.toThrow(ConflictException);
    });

    it("should send verification email after register", async () => {
      usersService.findByEmail?.mockResolvedValue(null);
      usersService.create?.mockResolvedValue(mockUser());

      await authService.register(input);

      // fire-and-forget, give microtask a tick
      await new Promise((r) => setImmediate(r));
      expect(mailService.sendEmailVerification).toHaveBeenCalled();
    });
  });

  // ─── Login ────────────────────────────────────────

  describe("login", () => {
    it("should return tokens for valid credentials", async () => {
      usersService.findByEmail?.mockResolvedValue(mockUser());
      mockVerifyFn.mockResolvedValue(true);

      const result = await authService.login("test@example.com", "password123");

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("should throw UnauthorizedException for unknown email", async () => {
      usersService.findByEmail?.mockResolvedValue(null);

      await expect(authService.login("bad@example.com", "pass")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for wrong password", async () => {
      usersService.findByEmail?.mockResolvedValue(mockUser());
      mockVerifyFn.mockResolvedValue(false);

      await expect(authService.login("test@example.com", "wrong")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should require 2FA code when enabled", async () => {
      usersService.findByEmail?.mockResolvedValue(
        mockUser({ isTwoFactorEnabled: true, twoFactorSecret: "secret" }),
      );
      mockVerifyFn.mockResolvedValue(true);

      await expect(authService.login("test@example.com", "password123")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should reject invalid 2FA code", async () => {
      usersService.findByEmail?.mockResolvedValue(
        mockUser({ isTwoFactorEnabled: true, twoFactorSecret: "secret" }),
      );
      mockVerifyFn.mockResolvedValue(true);
      mockOtpVerify.mockReturnValue({ valid: false } as any);

      await expect(
        authService.login("test@example.com", "password123", "000000"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should accept valid 2FA code", async () => {
      usersService.findByEmail?.mockResolvedValue(
        mockUser({ isTwoFactorEnabled: true, twoFactorSecret: "secret" }),
      );
      mockVerifyFn.mockResolvedValue(true);
      mockOtpVerify.mockReturnValue({ valid: true } as any);

      const result = await authService.login("test@example.com", "password123", "123456");
      expect(result).toHaveProperty("accessToken");
    });
  });

  // ─── Refresh Token ────────────────────────────────

  describe("refreshToken", () => {
    it("should rotate token and return new pair", async () => {
      const storedToken = {
        userId: "user-id-1",
        tokenHash: "stored-hash",
        isRevoked: false,
        save: jest.fn().mockResolvedValue(undefined),
      };
      refreshTokenModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([storedToken]),
      });
      mockVerifyFn.mockResolvedValue(true);

      const result = await authService.refreshToken("some-token");

      expect(storedToken.isRevoked).toBe(true);
      expect(storedToken.save).toHaveBeenCalled();
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("should throw UnauthorizedException for invalid token", async () => {
      refreshTokenModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      await expect(authService.refreshToken("bad-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw when no tokens match hash", async () => {
      const storedToken = {
        userId: "user-id-1",
        tokenHash: "stored-hash",
        isRevoked: false,
        save: jest.fn(),
      };
      refreshTokenModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([storedToken]),
      });
      mockVerifyFn.mockResolvedValue(false);

      await expect(authService.refreshToken("wrong-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── Password Reset ──────────────────────────────

  describe("requestPasswordReset", () => {
    it("should send reset email for existing user", async () => {
      usersService.findByEmail?.mockResolvedValue(mockUser());

      const result = await authService.requestPasswordReset("test@example.com");

      expect(mailService.sendPasswordReset).toHaveBeenCalledWith(
        "test@example.com",
        "jwt-token",
      );
      expect(result.message).toContain("reset link has been sent");
    });

    it("should return same message for non-existing email (no enumeration)", async () => {
      usersService.findByEmail?.mockResolvedValue(null);

      const result = await authService.requestPasswordReset("unknown@example.com");

      expect(mailService.sendPasswordReset).not.toHaveBeenCalled();
      expect(result.message).toContain("reset link has been sent");
    });
  });

  describe("resetPassword", () => {
    it("should reset password with valid token", async () => {
      jwtService.verify?.mockReturnValue({ sub: "user-id-1", type: "password-reset" });

      const result = await authService.resetPassword({
        token: "valid-token",
        newPassword: "newpass123",
      });

      expect(usersService.setPassword).toHaveBeenCalledWith("user-id-1", "hashed-value");
      expect(refreshTokenModel.updateMany).toHaveBeenCalledWith(
        { userId: "user-id-1", isRevoked: false },
        { isRevoked: true },
      );
      expect(result.message).toContain("Password reset successfully");
    });

    it("should throw BadRequestException for invalid token type", async () => {
      jwtService.verify?.mockReturnValue({ sub: "user-id-1", type: "email-verification" });

      await expect(
        authService.resetPassword({ token: "wrong-type", newPassword: "newpass123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for expired token", async () => {
      jwtService.verify?.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      await expect(
        authService.resetPassword({ token: "expired", newPassword: "newpass123" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("changePassword", () => {
    it("should change password with correct current password", async () => {
      usersService.findById?.mockResolvedValue(mockUser());
      mockVerifyFn.mockResolvedValue(true);

      const result = await authService.changePassword("user-id-1", {
        currentPassword: "oldpass",
        newPassword: "newpass123",
      });

      expect(usersService.setPassword).toHaveBeenCalledWith("user-id-1", "hashed-value");
      expect(result.message).toContain("Password changed");
    });

    it("should throw UnauthorizedException for wrong current password", async () => {
      usersService.findById?.mockResolvedValue(mockUser());
      mockVerifyFn.mockResolvedValue(false);

      await expect(
        authService.changePassword("user-id-1", {
          currentPassword: "wrong",
          newPassword: "newpass123",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── 2FA ──────────────────────────────────────────

  describe("generateTwoFactorSecret", () => {
    it("should return secret and qr code", async () => {
      usersService.findById?.mockResolvedValue(mockUser());

      const result = await authService.generateTwoFactorSecret("user-id-1");

      expect(result.secret).toBe("TOTP_SECRET");
      expect(result.qrCodeUrl).toContain("data:image/png");
      expect(usersService.setTwoFactorSecret).toHaveBeenCalledWith("user-id-1", "TOTP_SECRET");
    });
  });

  describe("enableTwoFactor", () => {
    it("should enable 2FA with valid code", async () => {
      usersService.findById?.mockResolvedValue(mockUser({ twoFactorSecret: "secret" }));
      mockOtpVerify.mockReturnValue({ valid: true } as any);

      const result = await authService.enableTwoFactor("user-id-1", "123456");

      expect(usersService.enableTwoFactor).toHaveBeenCalledWith("user-id-1");
      expect(result.message).toContain("enabled");
    });

    it("should throw if no secret generated yet", async () => {
      usersService.findById?.mockResolvedValue(mockUser({ twoFactorSecret: undefined }));

      await expect(authService.enableTwoFactor("user-id-1", "123456")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw for invalid 2FA code", async () => {
      usersService.findById?.mockResolvedValue(mockUser({ twoFactorSecret: "secret" }));
      mockOtpVerify.mockReturnValue({ valid: false } as any);

      await expect(authService.enableTwoFactor("user-id-1", "000000")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("disableTwoFactor", () => {
    it("should disable 2FA with valid password", async () => {
      usersService.findById?.mockResolvedValue(mockUser());
      mockVerifyFn.mockResolvedValue(true);

      const result = await authService.disableTwoFactor("user-id-1", "password123");

      expect(usersService.disableTwoFactor).toHaveBeenCalledWith("user-id-1");
      expect(result.message).toContain("disabled");
    });

    it("should throw for wrong password", async () => {
      usersService.findById?.mockResolvedValue(mockUser());
      mockVerifyFn.mockResolvedValue(false);

      await expect(authService.disableTwoFactor("user-id-1", "wrong")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── Logout ───────────────────────────────────────

  describe("logout", () => {
    it("should revoke all refresh tokens", async () => {
      const result = await authService.logout("user-id-1");

      expect(refreshTokenModel.updateMany).toHaveBeenCalledWith(
        { userId: "user-id-1", isRevoked: false },
        { isRevoked: true },
      );
      expect(result.message).toContain("Logged out");
    });
  });

  // ─── Magic Link ──────────────────────────────────

  describe("requestMagicLink", () => {
    it("should send magic link email for existing user", async () => {
      usersService.findByEmail?.mockResolvedValue(mockUser());

      const result = await authService.requestMagicLink("test@example.com");

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: "user-id-1", type: "magic-link" },
        expect.objectContaining({ expiresIn: "15m" }),
      );
      expect(mailService.sendMagicLink).toHaveBeenCalledWith("test@example.com", "jwt-token");
      expect(result.message).toContain("magic link");
    });

    it("should return same message for non-existing email", async () => {
      usersService.findByEmail?.mockResolvedValue(null);

      const result = await authService.requestMagicLink("unknown@example.com");

      expect(mailService.sendMagicLink).not.toHaveBeenCalled();
      expect(result.message).toContain("magic link");
    });
  });

  describe("verifyMagicLink", () => {
    it("should return tokens for valid magic link token", async () => {
      jwtService.verify?.mockReturnValue({ sub: "user-id-1", type: "magic-link" });
      usersService.findById?.mockResolvedValue(mockUser({ isEmailVerified: true }));

      const result = await authService.verifyMagicLink("valid-token");

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("should auto-verify email on magic link login", async () => {
      jwtService.verify?.mockReturnValue({ sub: "user-id-1", type: "magic-link" });
      usersService.findById?.mockResolvedValue(mockUser({ isEmailVerified: false }));

      await authService.verifyMagicLink("valid-token");

      expect(usersService.verifyEmail).toHaveBeenCalledWith("user-id-1");
    });

    it("should throw for invalid token type", async () => {
      jwtService.verify?.mockReturnValue({ sub: "user-id-1", type: "password-reset" });

      await expect(authService.verifyMagicLink("wrong-type-token")).rejects.toThrow(BadRequestException);
    });

    it("should throw for expired token", async () => {
      jwtService.verify?.mockImplementation(() => { throw new Error("jwt expired"); });

      await expect(authService.verifyMagicLink("expired-token")).rejects.toThrow(BadRequestException);
    });
  });

  // ─── OAuth ────────────────────────────────────────

  describe("oauthLogin", () => {
    const oauthProfile = {
      id: "google-123",
      email: "oauth@example.com",
      firstName: "OAuth",
      lastName: "User",
      avatarUrl: "https://photo.url/pic.jpg",
    };

    it("should return tokens for existing OAuth user", async () => {
      oauthService.getUserProfile?.mockResolvedValue(oauthProfile);
      usersService.findByOAuth?.mockResolvedValue(mockUser({ id: "existing-oauth-user" }));

      const result = await authService.oauthLogin("google" as any, "code", "http://localhost");

      expect(usersService.findByOAuth).toHaveBeenCalledWith("google", "google-123");
      expect(result).toHaveProperty("accessToken");
      expect(usersService.createOAuthUser).not.toHaveBeenCalled();
    });

    it("should link OAuth to existing email user", async () => {
      oauthService.getUserProfile?.mockResolvedValue(oauthProfile);
      usersService.findByOAuth?.mockResolvedValue(null);
      usersService.findByEmail?.mockResolvedValue(mockUser({ id: "email-user", isEmailVerified: false }));

      const result = await authService.oauthLogin("google" as any, "code", "http://localhost");

      expect(usersService.linkOAuth).toHaveBeenCalledWith("email-user", "google", "google-123");
      expect(usersService.verifyEmail).toHaveBeenCalledWith("email-user");
      expect(result).toHaveProperty("accessToken");
    });

    it("should create new user for unknown OAuth profile", async () => {
      oauthService.getUserProfile?.mockResolvedValue(oauthProfile);
      usersService.findByOAuth?.mockResolvedValue(null);
      usersService.findByEmail?.mockResolvedValue(null);
      usersService.createOAuthUser?.mockResolvedValue(mockUser({ id: "new-oauth-user" }));

      const result = await authService.oauthLogin("github" as any, "code", "http://localhost");

      expect(usersService.createOAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "oauth@example.com",
          oauthProvider: "github",
          oauthId: "google-123",
        }),
      );
      expect(result).toHaveProperty("accessToken");
    });
  });
});
