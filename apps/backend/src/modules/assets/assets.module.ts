import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { ProjectEntity, ProjectSchema } from "../projects/entities/project.entity";
import { UsersModule } from "../users/users.module";
import { AssetsController } from "./assets.controller";
import { AssetsResolver } from "./assets.resolver";
import { AssetsService } from "./assets.service";
import { ShareLinkEntity, ShareLinkSchema } from "./entities/share-link.entity";
import { UploadAssetEntity, UploadAssetSchema } from "./entities/upload-asset.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UploadAssetEntity.name, schema: UploadAssetSchema },
      { name: ShareLinkEntity.name, schema: ShareLinkSchema },
      { name: ProjectEntity.name, schema: ProjectSchema },
    ]),
    AuthModule,
    UsersModule,
  ],
  providers: [AssetsService, AssetsResolver],
  controllers: [AssetsController],
  exports: [AssetsService],
})
export class AssetsModule {}
