import { Field, InputType } from "@nestjs/graphql";
import { IsEnum, IsString, IsUrl } from "class-validator";

import { OAuthProvider } from "../../users/entities/user.entity";

@InputType()
export class OAuthLoginDto {
  @Field(() => OAuthProvider)
  @IsEnum(OAuthProvider)
  provider!: OAuthProvider;

  @Field()
  @IsString()
  code!: string;

  @Field()
  @IsUrl({ require_tld: false })
  redirectUri!: string;
}
