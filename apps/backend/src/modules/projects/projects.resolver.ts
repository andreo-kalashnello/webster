import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import GraphQLJSON from "graphql-type-json";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UseAuth } from "../auth/decorators/use-auth.decorator";
import { UserEntity } from "../users/entities/user.entity";
import { CreateProjectDto } from "./dto/create-project.dto";
import { ProjectsPageResponse, ProjectsPaginationDto } from "./dto/projects-pagination.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectEntity } from "./entities/project.entity";
import { ProjectsService } from "./projects.service";

@Resolver(() => ProjectEntity)
@UseAuth()
export class ProjectsResolver {
  constructor(private readonly projectsService: ProjectsService) {}

  // ─── Queries ─────────────────────────────────────────

  @Query(() => ProjectsPageResponse)
  projects(
    @CurrentUser() user: UserEntity,
    @Args("pagination", { nullable: true }) pagination: ProjectsPaginationDto = {},
  ) {
    return this.projectsService.findAllByUser(user.id, pagination);
  }

  @Query(() => ProjectEntity)
  project(
    @CurrentUser() user: UserEntity,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.projectsService.findById(id, user.id);
  }

  // ─── Mutations ───────────────────────────────────────

  @Mutation(() => ProjectEntity)
  createProject(
    @CurrentUser() user: UserEntity,
    @Args("input") input: CreateProjectDto,
  ) {
    return this.projectsService.create(user.id, input);
  }

  @Mutation(() => ProjectEntity)
  updateProject(
    @CurrentUser() user: UserEntity,
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.id, input);
  }

  @Mutation(() => ProjectEntity)
  autosaveProject(
    @CurrentUser() user: UserEntity,
    @Args("id", { type: () => ID }) id: string,
    @Args("content", { type: () => GraphQLJSON }) content: unknown,
    @Args("thumbnailUrl", { nullable: true }) thumbnailUrl?: string,
  ) {
    return this.projectsService.autosave(id, user.id, content, thumbnailUrl);
  }

  @Mutation(() => Boolean)
  deleteProject(
    @CurrentUser() user: UserEntity,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.projectsService.delete(id, user.id);
  }

  @Mutation(() => ProjectEntity)
  cloneProject(
    @CurrentUser() user: UserEntity,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.projectsService.clone(id, user.id);
  }
}
