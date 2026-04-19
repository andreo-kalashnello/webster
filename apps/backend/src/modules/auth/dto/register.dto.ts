import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsString, MinLength } from "class-validator";

@InputType()
export class RegisterDto {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  password!: string;

  @Field()
  @IsString()
  @MinLength(1)
  firstName!: string;

  @Field()
  @IsString()
  @MinLength(1)
  lastName!: string;
}
