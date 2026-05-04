import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Model } from "mongoose";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

import { ShareLinkEntity } from "../../modules/assets/entities/share-link.entity";
import { UploadAssetEntity } from "../../modules/assets/entities/upload-asset.entity";

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectModel(ShareLinkEntity.name)
    private readonly shareLinkModel: Model<ShareLinkEntity>,
    @InjectModel(UploadAssetEntity.name)
    private readonly uploadAssetModel: Model<UploadAssetEntity>,
  ) {}

  /**
   * Every hour: delete share links that have expired or been revoked over 7 days ago.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredShareLinks(): Promise<void> {
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await this.shareLinkModel.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { isRevoked: true, updatedAt: { $lt: threshold } },
      ],
    });

    if (result.deletedCount > 0) {
      this.logger.log(`Cleanup: removed ${result.deletedCount} expired/revoked share links`);
    }
  }

  /**
   * Every day at 03:00: remove UploadAsset records (and their files) that have no
   * associated project and were created more than 48 h ago (orphans from failed uploads).
   */
  @Cron("0 3 * * *")
  async cleanupOrphanUploads(): Promise<void> {
    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const orphans = await this.uploadAssetModel
      .find({ projectId: null, createdAt: { $lt: threshold } })
      .lean();

    if (orphans.length === 0) return;

    let removedFiles = 0;
    let failedFiles = 0;

    for (const asset of orphans) {
      const filePath = join(process.cwd(), "uploads", asset.fileName as string);
      try {
        await unlink(filePath);
        removedFiles++;
      } catch {
        // File may already be missing — not a hard error.
        failedFiles++;
      }
    }

    await this.uploadAssetModel.deleteMany({
      _id: { $in: orphans.map((a) => a._id) },
    });

    this.logger.log(
      `Cleanup: removed ${orphans.length} orphan upload records ` +
        `(files deleted: ${removedFiles}, already missing: ${failedFiles})`,
    );
  }
}
