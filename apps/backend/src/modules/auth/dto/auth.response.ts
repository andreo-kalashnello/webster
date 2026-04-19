import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class TwoFactorSetupResponse {
  @Field()
  secret!: string;

  @Field()
  qrCodeUrl!: string;
}

@ObjectType()
export class MessageResponse {
  @Field()
  message!: string;
}
