import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString, IsUrl, MinLength } from "class-validator";

@InputType()
export class UpdateProfileDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
