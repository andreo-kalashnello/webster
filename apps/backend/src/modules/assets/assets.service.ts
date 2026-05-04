import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";

import { ProjectEntity } from "../projects/entities/project.entity";
import { ExportAssetResponse, ShareLinkResponse } from "./assets.types";
import { ShareLinkEntity } from "./entities/share-link.entity";
import { UploadAssetEntity } from "./entities/upload-asset.entity";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
]);

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(UploadAssetEntity.name)
    private readonly uploadAssetModel: Model<UploadAssetEntity>,
    @InjectModel(ShareLinkEntity.name)
    private readonly shareLinkModel: Model<ShareLinkEntity>,
    @InjectModel(ProjectEntity.name)
    private readonly projectModel: Model<ProjectEntity>,
  ) {}

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    projectId?: string,
  ): Promise<UploadAssetEntity> {
    if (!file) throw new BadRequestException("File is required");
    if (file.size > MAX_FILE_SIZE) throw new BadRequestException("File is too large");
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("Unsupported file type");
    }

    if (projectId) {
      await this.assertProjectOwnership(projectId, userId);
    }

    const extension = this.extensionFromMime(file.mimetype);
    const fileName = `${randomUUID()}${extension}`;
    const targetDir = join(process.cwd(), "uploads");
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, fileName), file.buffer);

    return this.uploadAssetModel.create({
      userId: new Types.ObjectId(userId),
      projectId: projectId ? new Types.ObjectId(projectId) : null,
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${fileName}`,
    });
  }

  async createShareLink(
    projectId: string,
    userId: string,
    expiresInHours?: number,
  ): Promise<ShareLinkResponse> {
    await this.assertProjectOwnership(projectId, userId);

    const token = randomUUID().replace(/-/g, "");
    const expiresAt =
      expiresInHours && expiresInHours > 0
        ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
        : null;

    await this.shareLinkModel.create({
      token,
      projectId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(userId),
      expiresAt,
      isRevoked: false,
    });

    return {
      token,
      url: `/share/${token}`,
      expiresAt: expiresAt ?? undefined,
    };
  }

  async resolveShareLink(token: string): Promise<ProjectEntity> {
    const link = await this.shareLinkModel.findOne({ token, isRevoked: false }).exec();
    if (!link) throw new NotFoundException("Share link not found");

    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException("Share link expired");
    }

    const project = await this.projectModel
      .findOne({ _id: link.projectId, isDeleted: false })
      .exec();
    if (!project) throw new NotFoundException("Project not found");

    return project;
  }

  async exportPng(projectId: string, userId: string): Promise<ExportAssetResponse> {
    await this.assertProjectOwnership(projectId, userId);
    const fileName = `${randomUUID()}.png`;

    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9s4Nn0QAAAABJRU5ErkJggg==";
    const buffer = Buffer.from(pngBase64, "base64");

    await this.writeExportFile(fileName, buffer);

    return { fileName, mimeType: "image/png", url: `/exports/${fileName}` };
  }

  async exportJpg(projectId: string, userId: string): Promise<ExportAssetResponse> {
    await this.assertProjectOwnership(projectId, userId);
    const fileName = `${randomUUID()}.jpg`;

    const jpgBase64 =
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEA8QDw8PDw8PDw8PDw8PDw8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGi0fHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAgMBIgACEQEDEQH/xAAcAAABBQEBAQAAAAAAAAAAAAAAAQIDBAUGBwj/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAgAB/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A8qAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/Z";
    const buffer = Buffer.from(jpgBase64, "base64");

    await this.writeExportFile(fileName, buffer);

    return { fileName, mimeType: "image/jpeg", url: `/exports/${fileName}` };
  }

  async exportPdf(projectId: string, userId: string): Promise<ExportAssetResponse> {
    const project = await this.assertProjectOwnership(projectId, userId);

    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]);
    const font = await doc.embedFont(StandardFonts.Helvetica);

    page.drawText(`Project: ${project.title}`, {
      x: 50,
      y: 780,
      size: 16,
      font,
    });

    const contentPreview = JSON.stringify(project.content ?? {}, null, 2).slice(0, 2000);
    page.drawText(contentPreview || "{}", {
      x: 50,
      y: 740,
      size: 10,
      lineHeight: 12,
      font,
      maxWidth: 500,
    });

    const fileName = `${randomUUID()}.pdf`;
    const bytes = await doc.save();
    await this.writeExportFile(fileName, Buffer.from(bytes));

    return { fileName, mimeType: "application/pdf", url: `/exports/${fileName}` };
  }

  async exportAdditionalFormat(
    projectId: string,
    userId: string,
    format: string,
  ): Promise<ExportAssetResponse> {
    await this.assertProjectOwnership(projectId, userId);

    const normalized = format.toLowerCase().trim();
    if (!/^[a-z0-9]{2,10}$/.test(normalized)) {
      throw new BadRequestException("Invalid format");
    }

    const fileName = `${randomUUID()}.${normalized}`;
    const payload = Buffer.from(JSON.stringify({
      projectId,
      format: normalized,
      exportedAt: new Date().toISOString(),
    }));

    await this.writeExportFile(fileName, payload);

    return { fileName, mimeType: "application/octet-stream", url: `/exports/${fileName}` };
  }

  private async writeExportFile(fileName: string, buffer: Buffer): Promise<void> {
    const targetDir = join(process.cwd(), "exports");
    await mkdir(targetDir, { recursive: true });
    await writeFile(join(targetDir, fileName), buffer);
  }

  private extensionFromMime(mime: string): string {
    switch (mime) {
      case "image/png":
        return ".png";
      case "image/jpeg":
        return ".jpg";
      case "image/webp":
        return ".webp";
      case "application/pdf":
        return ".pdf";
      default:
        return ".bin";
    }
  }

  private async assertProjectOwnership(projectId: string, userId: string): Promise<ProjectEntity> {
    const project = await this.projectModel
      .findOne({ _id: projectId, isDeleted: false })
      .exec();

    if (!project) throw new NotFoundException("Project not found");
    if (project.userId.toString() !== userId) {
      throw new ForbiddenException("Access denied");
    }

    return project;
  }
}
