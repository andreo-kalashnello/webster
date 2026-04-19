import { BadRequestException } from "@nestjs/common";

import { OAuthProvider } from "../../modules/users/entities/user.entity";
import { OAuthService } from "./oauth.service";

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("OAuthService", () => {
  let service: OAuthService;
  let configGet: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    configGet = jest.fn((key: string) => {
      const map: Record<string, string> = {
        GOOGLE_CLIENT_ID: "google-id",
        GOOGLE_CLIENT_SECRET: "google-secret",
        FACEBOOK_CLIENT_ID: "fb-id",
        FACEBOOK_CLIENT_SECRET: "fb-secret",
        GITHUB_CLIENT_ID: "gh-id",
        GITHUB_CLIENT_SECRET: "gh-secret",
      };
      return map[key];
    });

    service = new OAuthService({ get: configGet } as any);
  });

  describe("Google OAuth", () => {
    it("should return user profile from Google", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: "google-token" }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            id: "g-123",
            email: "google@test.com",
            given_name: "John",
            family_name: "Doe",
            picture: "https://photo.url",
          }),
        });

      const result = await service.getUserProfile(OAuthProvider.Google, "auth-code", "http://localhost/callback");

      expect(result).toEqual({
        id: "g-123",
        email: "google@test.com",
        firstName: "John",
        lastName: "Doe",
        avatarUrl: "https://photo.url",
      });
    });

    it("should throw when Google token exchange fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "error",
      });

      await expect(
        service.getUserProfile(OAuthProvider.Google, "bad-code", "http://localhost/callback"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("Facebook OAuth", () => {
    it("should return user profile from Facebook", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: "fb-token" }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            id: "fb-123",
            email: "fb@test.com",
            first_name: "Jane",
            last_name: "Smith",
            picture: { data: { url: "https://fb-photo.url" } },
          }),
        });

      const result = await service.getUserProfile(OAuthProvider.Facebook, "auth-code", "http://localhost/callback");

      expect(result).toEqual({
        id: "fb-123",
        email: "fb@test.com",
        firstName: "Jane",
        lastName: "Smith",
        avatarUrl: "https://fb-photo.url",
      });
    });
  });

  describe("GitHub OAuth", () => {
    it("should return user profile from GitHub", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: "gh-token" }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            id: 456,
            email: "gh@test.com",
            name: "Git Hub",
            login: "ghuser",
            avatar_url: "https://gh-photo.url",
          }),
        });

      const result = await service.getUserProfile(OAuthProvider.Github, "auth-code", "http://localhost/callback");

      expect(result).toEqual({
        id: "456",
        email: "gh@test.com",
        firstName: "Git",
        lastName: "Hub",
        avatarUrl: "https://gh-photo.url",
      });
    });

    it("should fetch primary email when user email is null", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: "gh-token" }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            id: 789,
            email: null,
            name: "Private",
            login: "private-user",
            avatar_url: "https://avatar.url",
          }),
        })
        .mockResolvedValueOnce({
          json: async () => [
            { email: "primary@test.com", primary: true, verified: true },
            { email: "secondary@test.com", primary: false, verified: true },
          ],
        });

      const result = await service.getUserProfile(OAuthProvider.Github, "code", "http://localhost/callback");
      expect(result.email).toBe("primary@test.com");
    });

    it("should throw when no email available from GitHub", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: "gh-token" }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ id: 999, email: null, login: "noemail" }),
        })
        .mockResolvedValueOnce({
          json: async () => [],
        });

      await expect(
        service.getUserProfile(OAuthProvider.Github, "code", "http://localhost/callback"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("unconfigured provider", () => {
    it("should throw when Google credentials are not set", async () => {
      const unconfiguredService = new OAuthService({
        get: jest.fn().mockReturnValue(undefined),
      } as any);

      await expect(
        unconfiguredService.getUserProfile(OAuthProvider.Google, "code", "http://localhost/callback"),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
