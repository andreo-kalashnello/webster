import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { Types } from "mongoose";

import { ProjectEntity } from "../projects/entities/project.entity";
import { TemplateEntity } from "./entities/template.entity";
import { TemplatesService } from "./templates.service";

const mockUserId = new Types.ObjectId().toString();
const mockTemplateId = new Types.ObjectId().toString();

function makeTemplate(overrides: Partial<TemplateEntity> = {}): TemplateEntity {
  return {
    _id: new Types.ObjectId(mockTemplateId),
    id: mockTemplateId,
    userId: new Types.ObjectId(mockUserId),
    title: "Template",
    width: 800,
    height: 600,
    content: null,
    isPublic: false,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as TemplateEntity;
}

describe("TemplatesService", () => {
  let service: TemplatesService;

  const mockTemplateModel = {
    find: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockProjectModel = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: getModelToken(TemplateEntity.name),
          useValue: mockTemplateModel,
        },
        {
          provide: getModelToken(ProjectEntity.name),
          useValue: mockProjectModel,
        },
      ],
    }).compile();

    service = moduleRef.get(TemplatesService);
  });

  it("should return base templates", async () => {
    const templates = [makeTemplate({ userId: null })];
    mockTemplateModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(templates),
    });

    const result = await service.findBaseTemplates();
    expect(result).toHaveLength(1);
  });

  it("should return user templates", async () => {
    const templates = [makeTemplate()];
    mockTemplateModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(templates),
    });

    const result = await service.findUserTemplates(mockUserId);
    expect(result).toHaveLength(1);
  });

  it("should create user template", async () => {
    const template = makeTemplate({ title: "Created" });
    mockTemplateModel.create.mockResolvedValue(template);

    const result = await service.createUserTemplate(mockUserId, { title: "Created" });
    expect(result.title).toBe("Created");
  });

  it("should update user template", async () => {
    const template = makeTemplate();
    const updated = makeTemplate({ title: "Updated" });

    mockTemplateModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(template),
    });
    mockTemplateModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updated),
    });

    const result = await service.updateUserTemplate(mockTemplateId, mockUserId, { title: "Updated" });
    expect(result.title).toBe("Updated");
  });

  it("should soft delete user template", async () => {
    const template = makeTemplate();
    mockTemplateModel.findOne.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(template),
    });
    mockTemplateModel.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const result = await service.deleteUserTemplate(mockTemplateId, mockUserId);
    expect(result).toBe(true);
  });

  it("should create project from own template", async () => {
    const template = makeTemplate({ title: "Template A", content: { shapes: [] } });
    const project = { id: new Types.ObjectId().toString(), title: "Template A" };

    mockTemplateModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(template) });
    mockProjectModel.create.mockResolvedValue(project);

    const result = await service.createProjectFromTemplate(mockTemplateId, mockUserId);
    expect(result.title).toBe("Template A");
  });

  it("should deny create project from private foreign template", async () => {
    const template = makeTemplate({ userId: new Types.ObjectId(), isPublic: false });
    mockTemplateModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(template) });

    await expect(service.createProjectFromTemplate(mockTemplateId, mockUserId)).rejects.toThrow(ForbiddenException);
  });

  it("should throw NotFound for missing template", async () => {
    mockTemplateModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(service.createProjectFromTemplate(mockTemplateId, mockUserId)).rejects.toThrow(NotFoundException);
  });
});
