import { Field, InputType, Int, ObjectType } from "@nestjs/graphql";
import { IsInt, IsOptional, Max, Min } from "class-validator";

import { ProjectEntity } from "../entities/project.entity";

@InputType()
export class ProjectsPaginationDto {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@ObjectType()
export class ProjectsPageResponse {
  @Field(() => [ProjectEntity])
  items!: ProjectEntity[];

  @Field(() => Int)
  total!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  totalPages!: number;
}
