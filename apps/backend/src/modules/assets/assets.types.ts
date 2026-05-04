import { Field, ObjectType } from "@nestjs/graphql";

import { ProjectEntity } from "../projects/entities/project.entity";

@ObjectType()
export class ShareLinkResponse {
  @Field()
  token!: string;

  @Field()
  url!: string;

  @Field(() => Date, { nullable: true })
  expiresAt?: Date;
}

@ObjectType()
export class ExportAssetResponse {
  @Field()
  fileName!: string;

  @Field()
  mimeType!: string;

  @Field()
  url!: string;
}

@ObjectType()
export class SharedProjectResponse {
  @Field(() => ProjectEntity)
  project!: ProjectEntity;
}
