import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { CreateProjectDto } from "./dto/create-project.dto";
import { ProjectsPageResponse, ProjectsPaginationDto } from "./dto/projects-pagination.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectVersionEntity } from "./entities/project-version.entity";
import { ProjectEntity } from "./entities/project.entity";

const MAX_PROJECT_VERSIONS = 20;

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(ProjectEntity.name)
    private readonly projectModel: Model<ProjectEntity>,
    @InjectModel(ProjectVersionEntity.name)
    private readonly projectVersionModel: Model<ProjectVersionEntity>,
  ) {}

  async create(userId: string, input: CreateProjectDto): Promise<ProjectEntity> {
    return this.projectModel.create({
      userId: new Types.ObjectId(userId),
      title: input.title,
      width: input.width ?? 800,
      height: input.height ?? 600,
      content: input.content ?? null,
    });
  }

  async findById(id: string, userId: string): Promise<ProjectEntity> {
    const project = await this.projectModel
      .findOne({ _id: id, userId: new Types.ObjectId(userId), isDeleted: false })
      .exec();
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async findAllByUser(
    userId: string,
    pagination: ProjectsPaginationDto,
  ): Promise<ProjectsPageResponse> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;
    const filter = { userId: new Types.ObjectId(userId), isDeleted: false };

    const [items, total] = await Promise.all([
      this.projectModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).exec(),
      this.projectModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    userId: string,
    input: UpdateProjectDto,
  ): Promise<ProjectEntity> {
    await this.assertOwnership(id, userId);

    const updated = await this.projectModel
      .findByIdAndUpdate(id, { $set: input }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException("Project not found");
    return updated;
  }

  async autosave(
    id: string,
    userId: string,
    content: unknown,
    thumbnailUrl?: string,
  ): Promise<ProjectEntity> {
    await this.assertOwnership(id, userId);

    const patch: Record<string, unknown> = { content };
    if (thumbnailUrl !== undefined) patch.thumbnailUrl = thumbnailUrl;

    const updated = await this.projectModel
      .findByIdAndUpdate(id, { $set: patch }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException("Project not found");
    return updated;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    await this.assertOwnership(id, userId);
    await this.projectModel.findByIdAndUpdate(id, { isDeleted: true }).exec();
    return true;
  }

  async clone(id: string, userId: string): Promise<ProjectEntity> {
    const source = await this.findById(id, userId);
    return this.projectModel.create({
      userId: new Types.ObjectId(userId),
      title: `${source.title} (copy)`,
      width: source.width,
      height: source.height,
      content: source.content,
      thumbnailUrl: source.thumbnailUrl,
    });
  }

  async createVersion(
    projectId: string,
    userId: string,
    label?: string,
  ): Promise<ProjectVersionEntity> {
    const project = await this.findById(projectId, userId);

    const version = await this.projectVersionModel.create({
      projectId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(userId),
      label,
      content: project.content ?? null,
    });

    await this.cleanupOldVersions(projectId);

    return version;
  }

  async listVersions(projectId: string, userId: string): Promise<ProjectVersionEntity[]> {
    await this.assertOwnership(projectId, userId);

    return this.projectVersionModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .limit(MAX_PROJECT_VERSIONS)
      .exec();
  }

  async restoreVersion(
    projectId: string,
    versionId: string,
    userId: string,
  ): Promise<ProjectEntity> {
    await this.assertOwnership(projectId, userId);

    const version = await this.projectVersionModel
      .findOne({
        _id: versionId,
        projectId: new Types.ObjectId(projectId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!version) throw new NotFoundException("Version not found");

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(projectId, { $set: { content: version.content ?? null } }, { new: true })
      .exec();
    if (!updatedProject) throw new NotFoundException("Project not found");

    return updatedProject;
  }

  // ─── Internal ───────────────────────────────────────

  private async assertOwnership(id: string, userId: string): Promise<void> {
    const project = await this.projectModel
      .findOne({ _id: id, isDeleted: false })
      .select("userId")
      .exec();
    if (!project) throw new NotFoundException("Project not found");
    if (project.userId.toString() !== userId) {
      throw new ForbiddenException("Access denied");
    }
  }

  private async cleanupOldVersions(projectId: string): Promise<void> {
    const staleVersions = await this.projectVersionModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .skip(MAX_PROJECT_VERSIONS)
      .select("_id")
      .lean()
      .exec();

    if (staleVersions.length === 0) return;

    await this.projectVersionModel
      .deleteMany({ _id: { $in: staleVersions.map((v) => v._id) } })
      .exec();
  }
}
