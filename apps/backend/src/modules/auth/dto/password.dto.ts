import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsString, MinLength } from "class-validator";

@InputType()
export class ResetPasswordDto {
  @Field()
  @IsString()
  token!: string;

  @Field()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

@InputType()
export class RequestPasswordResetDto {
  @Field()
  @IsEmail()
  email!: string;
}

@InputType()
export class ChangePasswordDto {
  @Field()
  @IsString()
  currentPassword!: string;

  @Field()
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
