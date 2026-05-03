import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { Types } from "mongoose";

import { ProjectEntity } from "./entities/project.entity";
import { ProjectsService } from "./projects.service";

const mockUserId = new Types.ObjectId().toString();
const mockProjectId = new Types.ObjectId().toString();

function makeProject(overrides: Partial<ProjectEntity> = {}): ProjectEntity {
  return {
    _id: new Types.ObjectId(mockProjectId),
    id: mockProjectId,
    userId: new Types.ObjectId(mockUserId),
    title: "Test Project",
    width: 800,
    height: 600,
    content: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as ProjectEntity;
}

describe("ProjectsService", () => {
  let service: ProjectsService;

  const mockProjectModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getModelToken(ProjectEntity.name),
          useValue: mockProjectModel,
        },
      ],
    }).compile();

    service = moduleRef.get(ProjectsService);
  });

  // ─── create ─────────────────────────────────────────

  describe("create", () => {
    it("should create a project with defaults", async () => {
      const project = makeProject();
      mockProjectModel.create.mockResolvedValue(project);

      const result = await service.create(mockUserId, { title: "Test Project" });

      expect(mockProjectModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Test Project", width: 800, height: 600 }),
      );
      expect(result.title).toBe("Test Project");
    });

    it("should create a project with custom dimensions", async () => {
      const project = makeProject({ width: 1920, height: 1080 });
      mockProjectModel.create.mockResolvedValue(project);

      await service.create(mockUserId, { title: "Custom", width: 1920, height: 1080 });

      expect(mockProjectModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ width: 1920, height: 1080 }),
      );
    });
  });

  // ─── findById ────────────────────────────────────────

  describe("findById", () => {
    it("should return project for owner", async () => {
      const project = makeProject();
      mockProjectModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(project) });

      const result = await service.findById(mockProjectId, mockUserId);
      expect(result.id).toBe(mockProjectId);
    });

    it("should throw NotFoundException for missing project", async () => {
      mockProjectModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.findById(mockProjectId, mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAllByUser ───────────────────────────────────

  describe("findAllByUser", () => {
    it("should return paginated projects", async () => {
      const projects = [makeProject(), makeProject()];
      mockProjectModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(projects),
      });
      mockProjectModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(5) });

      const result = await service.findAllByUser(mockUserId, { page: 1, limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(1);
    });
  });

  // ─── update ─────────────────────────────────────────

  describe("update", () => {
    it("should update a project owned by user", async () => {
      const project = makeProject();
      const updated = makeProject({ title: "Renamed" });

      // assertOwnership mock
      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(project),
      });
      mockProjectModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) });

      const result = await service.update(mockProjectId, mockUserId, { title: "Renamed" });
      expect(result.title).toBe("Renamed");
    });

    it("should throw ForbiddenException for non-owner", async () => {
      const project = makeProject({ userId: new Types.ObjectId() });
      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(project),
      });

      await expect(
        service.update(mockProjectId, mockUserId, { title: "Hack" }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── autosave ────────────────────────────────────────

  describe("autosave", () => {
    it("should update content and thumbnailUrl", async () => {
      const project = makeProject();
      const updated = makeProject({ content: { shapes: [] }, thumbnailUrl: "http://img.url/t.png" });

      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(project),
      });
      mockProjectModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) });

      const result = await service.autosave(mockProjectId, mockUserId, { shapes: [] }, "http://img.url/t.png");
      expect(result.thumbnailUrl).toBe("http://img.url/t.png");
    });
  });

  // ─── delete ─────────────────────────────────────────

  describe("delete", () => {
    it("should soft-delete a project", async () => {
      const project = makeProject();
      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(project),
      });
      mockProjectModel.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await service.delete(mockProjectId, mockUserId);
      expect(result).toBe(true);
      expect(mockProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProjectId,
        { isDeleted: true },
      );
    });

    it("should throw ForbiddenException for non-owner", async () => {
      const project = makeProject({ userId: new Types.ObjectId() });
      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(project),
      });

      await expect(service.delete(mockProjectId, mockUserId)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── clone ──────────────────────────────────────────

  describe("clone", () => {
    it("should clone a project with (copy) suffix", async () => {
      const source = makeProject({ title: "Original" });
      const cloned = makeProject({ title: "Original (copy)", _id: new Types.ObjectId() } as any);

      // findById calls findOne
      mockProjectModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(source) });
      mockProjectModel.create.mockResolvedValue(cloned);

      const result = await service.clone(mockProjectId, mockUserId);
      expect(result.title).toBe("Original (copy)");
    });

    it("should throw NotFoundException when cloning non-existent project", async () => {
      mockProjectModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(service.clone(mockProjectId, mockUserId)).rejects.toThrow(NotFoundException);
    });
  });
});
