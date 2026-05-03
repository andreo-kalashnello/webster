import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
    ShareLinkEntity,
    ShareLinkSchema,
} from "../../modules/assets/entities/share-link.entity";
import {
    UploadAssetEntity,
    UploadAssetSchema,
} from "../../modules/assets/entities/upload-asset.entity";
import { CleanupService } from "./cleanup.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ShareLinkEntity.name, schema: ShareLinkSchema },
      { name: UploadAssetEntity.name, schema: UploadAssetSchema },
    ]),
  ],
  providers: [CleanupService],
})
export class CleanupModule {}
