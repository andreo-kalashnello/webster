import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UseAuth } from "../auth/decorators/use-auth.decorator";
import { ProjectEntity } from "../projects/entities/project.entity";
import { UserEntity } from "../users/entities/user.entity";
import { AssetsService } from "./assets.service";
import { ExportAssetResponse, ShareLinkResponse } from "./assets.types";

@Resolver()
export class AssetsResolver {
  constructor(private readonly assetsService: AssetsService) {}

  @UseAuth()
  @Mutation(() => ShareLinkResponse)
  createShareLink(
    @CurrentUser() user: UserEntity,
    @Args("projectId", { type: () => ID }) projectId: string,
    @Args("expiresInHours", { nullable: true }) expiresInHours?: number,
  ) {
    return this.assetsService.createShareLink(projectId, user.id, expiresInHours);
  }

  @Query(() => ProjectEntity)
  resolveShareLink(
    @Args("token") token: string,
  ) {
    return this.assetsService.resolveShareLink(token);
  }

  @UseAuth()
  @Mutation(() => ExportAssetResponse)
  exportPng(
    @CurrentUser() user: UserEntity,
    @Args("projectId", { type: () => ID }) projectId: string,
  ) {
    return this.assetsService.exportPng(projectId, user.id);
  }

  @UseAuth()
  @Mutation(() => ExportAssetResponse)
  exportJpg(
    @CurrentUser() user: UserEntity,
    @Args("projectId", { type: () => ID }) projectId: string,
  ) {
    return this.assetsService.exportJpg(projectId, user.id);
  }

  @UseAuth()
  @Mutation(() => ExportAssetResponse)
  exportPdf(
    @CurrentUser() user: UserEntity,
    @Args("projectId", { type: () => ID }) projectId: string,
  ) {
    return this.assetsService.exportPdf(projectId, user.id);
  }

  @UseAuth()
  @Mutation(() => ExportAssetResponse)
  exportAdditionalFormat(
    @CurrentUser() user: UserEntity,
    @Args("projectId", { type: () => ID }) projectId: string,
    @Args("format") format: string,
  ) {
    return this.assetsService.exportAdditionalFormat(projectId, user.id, format);
  }
}
