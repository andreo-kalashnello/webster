import { Field, InputType } from "@nestjs/graphql";
import { IsEmail } from "class-validator";

@InputType()
export class RequestMagicLinkDto {
  @Field()
  @IsEmail()
  email!: string;
}
