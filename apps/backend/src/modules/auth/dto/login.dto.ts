import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

@InputType()
export class LoginDto {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  password!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
