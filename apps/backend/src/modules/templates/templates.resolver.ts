import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UseAuth } from "../auth/decorators/use-auth.decorator";
import { ProjectEntity } from "../projects/entities/project.entity";
import { UserEntity } from "../users/entities/user.entity";
import { CreateUserTemplateDto } from "./dto/create-user-template.dto";
import { UpdateUserTemplateDto } from "./dto/update-user-template.dto";
import { TemplateEntity } from "./entities/template.entity";
import { TemplatesService } from "./templates.service";

@Resolver(() => TemplateEntity)
@UseAuth()
export class TemplatesResolver {
  constructor(private readonly templatesService: TemplatesService) {}

  @Query(() => [TemplateEntity])
  baseTemplates() {
    return this.templatesService.findBaseTemplates();
  }

  @Query(() => [TemplateEntity])
  userTemplates(
    @CurrentUser() user: UserEntity,
  ) {
    return this.templatesService.findUserTemplates(user.id);
  }

  @Mutation(() => TemplateEntity)
  createUserTemplate(
    @CurrentUser() user: UserEntity,
    @Args("input") input: CreateUserTemplateDto,
  ) {
    return this.templatesService.createUserTemplate(user.id, input);
  }

  @Mutation(() => TemplateEntity)
  updateUserTemplate(
    @CurrentUser() user: UserEntity,
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateUserTemplateDto,
  ) {
    return this.templatesService.updateUserTemplate(id, user.id, input);
  }

  @Mutation(() => Boolean)
  deleteUserTemplate(
    @CurrentUser() user: UserEntity,
    @Args("id", { type: () => ID }) id: string,
  ) {
    return this.templatesService.deleteUserTemplate(id, user.id);
  }

  @Mutation(() => ProjectEntity)
  createProjectFromTemplate(
    @CurrentUser() user: UserEntity,
    @Args("templateId", { type: () => ID }) templateId: string,
    @Args("title", { nullable: true }) title?: string,
  ) {
    return this.templatesService.createProjectFromTemplate(templateId, user.id, title);
  }
}
