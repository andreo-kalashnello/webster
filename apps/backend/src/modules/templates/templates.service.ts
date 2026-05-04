import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { ProjectEntity } from "../projects/entities/project.entity";
import { CreateUserTemplateDto } from "./dto/create-user-template.dto";
import { UpdateUserTemplateDto } from "./dto/update-user-template.dto";
import { TemplateEntity } from "./entities/template.entity";

@Injectable()
export class TemplatesService {
  constructor(
    @InjectModel(TemplateEntity.name)
    private readonly templateModel: Model<TemplateEntity>,
    @InjectModel(ProjectEntity.name)
    private readonly projectModel: Model<ProjectEntity>,
  ) {}

  async findBaseTemplates(): Promise<TemplateEntity[]> {
    return this.templateModel
      .find({ userId: null, isDeleted: false })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findUserTemplates(userId: string): Promise<TemplateEntity[]> {
    return this.templateModel
      .find({ userId: new Types.ObjectId(userId), isDeleted: false })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async createUserTemplate(userId: string, input: CreateUserTemplateDto): Promise<TemplateEntity> {
    return this.templateModel.create({
      userId: new Types.ObjectId(userId),
      title: input.title,
      width: input.width ?? 800,
      height: input.height ?? 600,
      thumbnailUrl: input.thumbnailUrl,
      content: input.content ?? null,
      isPublic: input.isPublic ?? false,
    });
  }

  async updateUserTemplate(
    id: string,
    userId: string,
    input: UpdateUserTemplateDto,
  ): Promise<TemplateEntity> {
    await this.assertTemplateOwnership(id, userId);

    const updated = await this.templateModel
      .findByIdAndUpdate(id, { $set: input }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException("Template not found");
    return updated;
  }

  async deleteUserTemplate(id: string, userId: string): Promise<boolean> {
    await this.assertTemplateOwnership(id, userId);
    await this.templateModel.findByIdAndUpdate(id, { isDeleted: true }).exec();
    return true;
  }

  async createProjectFromTemplate(
    templateId: string,
    userId: string,
    title?: string,
  ): Promise<ProjectEntity> {
    const template = await this.templateModel
      .findOne({ _id: templateId, isDeleted: false })
      .exec();

    if (!template) throw new NotFoundException("Template not found");

    const ownerId = template.userId?.toString();
    const isOwnTemplate = ownerId === userId;
    const isBaseTemplate = template.userId == null;
    const isPublicTemplate = template.isPublic;

    if (!isOwnTemplate && !isBaseTemplate && !isPublicTemplate) {
      throw new ForbiddenException("Access denied");
    }

    return this.projectModel.create({
      userId: new Types.ObjectId(userId),
      title: title ?? template.title,
      width: template.width,
      height: template.height,
      content: template.content ?? null,
      thumbnailUrl: template.thumbnailUrl,
    });
  }

  private async assertTemplateOwnership(id: string, userId: string): Promise<void> {
    const template = await this.templateModel
      .findOne({ _id: id, isDeleted: false })
      .select("userId")
      .exec();

    if (!template) throw new NotFoundException("Template not found");
    if (!template.userId || template.userId.toString() !== userId) {
      throw new ForbiddenException("Access denied");
    }
  }
}
