import { Field, ID, ObjectType, registerEnumType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export enum OAuthProvider {
  Google = "google",
  Facebook = "facebook",
  Github = "github",
}

registerEnumType(OAuthProvider, { name: "OAuthProvider" });

@ObjectType()
@Schema({ timestamps: true })
export class UserEntity extends Document {
  @Field(() => ID)
  declare id: string;

  @Field()
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop()
  passwordHash?: string;

  @Field()
  @Prop({ required: true, trim: true })
  firstName!: string;

  @Field()
  @Prop({ required: true, trim: true })
  lastName!: string;

  @Field({ nullable: true })
  @Prop()
  avatarUrl?: string;

  @Field()
  @Prop({ default: false })
  isEmailVerified!: boolean;

  @Field()
  @Prop({ default: false })
  isTwoFactorEnabled!: boolean;

  @Prop()
  twoFactorSecret?: string;

  @Field(() => OAuthProvider, { nullable: true })
  @Prop({ type: String, enum: OAuthProvider })
  oauthProvider?: OAuthProvider;

  @Prop()
  oauthId?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);
