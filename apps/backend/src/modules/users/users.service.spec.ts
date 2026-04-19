import { NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";

import { OAuthProvider, UserEntity } from "./entities/user.entity";
import { UsersService } from "./users.service";

const mockUser = (overrides: Partial<any> = {}) => ({
  id: "user-1",
  email: "test@example.com",
  passwordHash: "hashed",
  firstName: "John",
  lastName: "Doe",
  isEmailVerified: false,
  isTwoFactorEnabled: false,
  ...overrides,
});

describe("UsersService", () => {
  let service: UsersService;
  let model: Record<string, jest.Mock>;

  beforeEach(async () => {
    model = {
      findById: jest.fn().mockReturnValue({ exec: jest.fn() }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
      create: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(UserEntity.name), useValue: model },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe("findById", () => {
    it("should return user when found", async () => {
      const user = mockUser();
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      const result = await service.findById("user-1");
      expect(result).toEqual(user);
      expect(model.findById).toHaveBeenCalledWith("user-1");
    });

    it("should throw NotFoundException when not found", async () => {
      model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findById("bad-id")).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByEmail", () => {
    it("should return user by lowercase email", async () => {
      const user = mockUser();
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      const result = await service.findByEmail("Test@Example.com");
      expect(result).toEqual(user);
      expect(model.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
    });

    it("should return null when not found", async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.findByEmail("none@example.com");
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create user with lowercase email", async () => {
      const data = { email: "New@Example.com", passwordHash: "h", firstName: "A", lastName: "B" };
      model.create.mockResolvedValue(mockUser({ email: "new@example.com" }));

      const result = await service.create(data);
      expect(model.create).toHaveBeenCalledWith(expect.objectContaining({ email: "new@example.com" }));
      expect(result.email).toBe("new@example.com");
    });
  });

  describe("updateProfile", () => {
    it("should update and return user", async () => {
      const updated = mockUser({ firstName: "Jane" });
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) });

      const result = await service.updateProfile("user-1", { firstName: "Jane" });
      expect(result.firstName).toBe("Jane");
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith("user-1", { $set: { firstName: "Jane" } }, { new: true });
    });

    it("should throw NotFoundException when user not found", async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.updateProfile("bad-id", { firstName: "X" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("setPassword", () => {
    it("should update passwordHash", async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.setPassword("user-1", "new-hash");
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith("user-1", { passwordHash: "new-hash" });
    });
  });

  describe("verifyEmail", () => {
    it("should set isEmailVerified to true", async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.verifyEmail("user-1");
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith("user-1", { isEmailVerified: true });
    });
  });

  describe("findByOAuth", () => {
    it("should find user by provider and oauthId", async () => {
      const user = mockUser({ oauthProvider: OAuthProvider.Google, oauthId: "g-123" });
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(user) });

      const result = await service.findByOAuth(OAuthProvider.Google, "g-123");
      expect(result).toEqual(user);
      expect(model.findOne).toHaveBeenCalledWith({ oauthProvider: OAuthProvider.Google, oauthId: "g-123" });
    });
  });

  describe("createOAuthUser", () => {
    it("should create OAuth user with isEmailVerified=true", async () => {
      const data = {
        email: "OAuth@Example.com",
        firstName: "O",
        lastName: "A",
        oauthProvider: OAuthProvider.Github,
        oauthId: "gh-456",
      };
      model.create.mockResolvedValue(mockUser({ ...data, email: "oauth@example.com", isEmailVerified: true }));

      const result = await service.createOAuthUser(data);
      expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
        email: "oauth@example.com",
        isEmailVerified: true,
      }));
      expect(result.isEmailVerified).toBe(true);
    });
  });

  describe("linkOAuth", () => {
    it("should update user with OAuth info", async () => {
      model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue({}) });

      await service.linkOAuth("user-1", OAuthProvider.Facebook, "fb-789");
      expect(model.findByIdAndUpdate).toHaveBeenCalledWith("user-1", {
        oauthProvider: OAuthProvider.Facebook,
        oauthId: "fb-789",
      });
    });
  });
});
