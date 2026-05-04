import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { Types } from "mongoose";

import { ProjectVersionEntity } from "./entities/project-version.entity";
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

  const mockProjectVersionModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    deleteMany: jest.fn(),
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
        {
          provide: getModelToken(ProjectVersionEntity.name),
          useValue: mockProjectVersionModel,
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

  // ─── versions ───────────────────────────────────────

  describe("createVersion", () => {
    it("should create snapshot from project content", async () => {
      const project = makeProject({ content: { nodes: [{ id: 1 }] } });
      const version = {
        _id: new Types.ObjectId(),
        id: new Types.ObjectId().toString(),
        projectId: new Types.ObjectId(mockProjectId),
        userId: new Types.ObjectId(mockUserId),
        label: "v1",
        content: { nodes: [{ id: 1 }] },
        createdAt: new Date(),
      };

      mockProjectModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(project) });
      mockProjectVersionModel.create.mockResolvedValue(version);
      mockProjectVersionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.createVersion(mockProjectId, mockUserId, "v1");

      expect(mockProjectVersionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ label: "v1", content: { nodes: [{ id: 1 }] } }),
      );
      expect(result.label).toBe("v1");
    });

    it("should create version without label", async () => {
      const project = makeProject({ content: null });
      const version = {
        _id: new Types.ObjectId(),
        projectId: new Types.ObjectId(mockProjectId),
        userId: new Types.ObjectId(mockUserId),
        label: undefined,
        content: null,
        createdAt: new Date(),
      };

      mockProjectModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(project) });
      mockProjectVersionModel.create.mockResolvedValue(version);
      mockProjectVersionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.createVersion(mockProjectId, mockUserId);
      expect(mockProjectVersionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: null }),
      );
      expect(result.label).toBeUndefined();
    });

    it("should throw NotFoundException for non-existent project", async () => {
      mockProjectModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.createVersion(mockProjectId, mockUserId, "v1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when project belongs to another user", async () => {
      // createVersion uses findById which queries {_id, userId} — returns null for non-owner
      mockProjectModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.createVersion(mockProjectId, mockUserId, "v1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should trigger cleanup of old versions after creating", async () => {
      const project = makeProject({ content: { nodes: [] } });
      const staleVersions = Array.from({ length: 3 }, () => ({ _id: new Types.ObjectId() }));
      const version = {
        _id: new Types.ObjectId(),
        projectId: new Types.ObjectId(mockProjectId),
        userId: new Types.ObjectId(mockUserId),
        content: { nodes: [] },
        createdAt: new Date(),
      };

      mockProjectModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(project) });
      mockProjectVersionModel.create.mockResolvedValue(version);
      mockProjectVersionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(staleVersions),
      });
      mockProjectVersionModel.deleteMany = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 3 }) });

      await service.createVersion(mockProjectId, mockUserId);

      expect(mockProjectVersionModel.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ _id: { $in: staleVersions.map((v) => v._id) } }),
      );
    });
  });

  describe("listVersions", () => {
    it("should return sorted versions for project owner", async () => {
      const project = makeProject();
      const versions = [
        { id: "v2", createdAt: new Date() },
        { id: "v1", createdAt: new Date() },
      ];

      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(project),
      });
      mockProjectVersionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(versions),
      });

      const result = await service.listVersions(mockProjectId, mockUserId);
      expect(result).toHaveLength(2);
    });

    it("should throw ForbiddenException for non-owner", async () => {
      const otherProject = makeProject({ userId: new Types.ObjectId() });
      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(otherProject),
      });

      await expect(service.listVersions(mockProjectId, mockUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should throw NotFoundException when project does not exist", async () => {
      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.listVersions(mockProjectId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should return empty array when no versions exist", async () => {
      const project = makeProject();
      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(project),
      });
      mockProjectVersionModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.listVersions(mockProjectId, mockUserId);
      expect(result).toEqual([]);
    });
  });

  describe("restoreVersion", () => {
    it("should restore project content from selected version", async () => {
      const project = makeProject();
      const restored = makeProject({ content: { shapes: [{ id: "s1" }] } });

      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(project),
      });
      mockProjectVersionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ content: { shapes: [{ id: "s1" }] } }),
      });
      mockProjectModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(restored),
      });

      const result = await service.restoreVersion(
        mockProjectId,
        new Types.ObjectId().toString(),
        mockUserId,
      );

      expect(result.content).toEqual({ shapes: [{ id: "s1" }] });
    });

    it("should throw NotFoundException when version not found", async () => {
      const project = makeProject();

      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(project),
      });
      mockProjectVersionModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      await expect(
        service.restoreVersion(mockProjectId, new Types.ObjectId().toString(), mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException for non-owner", async () => {
      const otherProject = makeProject({ userId: new Types.ObjectId() });
      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(otherProject),
      });

      await expect(
        service.restoreVersion(mockProjectId, new Types.ObjectId().toString(), mockUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should restore version with null content", async () => {
      const project = makeProject();
      const restored = makeProject({ content: null });

      mockProjectModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(project),
      });
      mockProjectVersionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ content: null }),
      });
      mockProjectModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(restored),
      });

      const result = await service.restoreVersion(
        mockProjectId,
        new Types.ObjectId().toString(),
        mockUserId,
      );

      expect(mockProjectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProjectId,
        { $set: { content: null } },
        { new: true },
      );
      expect(result.content).toBeNull();
    });
  });
});
