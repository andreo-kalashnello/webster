import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UseAuth } from "../auth/decorators/use-auth.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UserEntity } from "./entities/user.entity";
import { UsersService } from "./users.service";

@Resolver(() => UserEntity)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => UserEntity)
  @UseAuth()
  me(@CurrentUser() user: UserEntity) {
    return user;
  }

  @Mutation(() => UserEntity)
  @UseAuth()
  updateProfile(
    @CurrentUser() user: UserEntity,
    @Args("input") input: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, input);
  }
}
