import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@ObjectType()
@Schema({ timestamps: true })
export class ShareLinkEntity extends Document {
  @Field(() => ID)
  declare id: string;

  @Field()
  @Prop({ required: true, unique: true, index: true })
  token!: string;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: "ProjectEntity", required: true, index: true })
  projectId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: "UserEntity", required: true, index: true })
  userId!: Types.ObjectId;

  @Field(() => Date, { nullable: true })
  @Prop({ type: Date, default: null })
  expiresAt?: Date | null;

  @Field()
  @Prop({ default: false, index: true })
  isRevoked!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

export const ShareLinkSchema = SchemaFactory.createForClass(ShareLinkEntity);

ShareLinkSchema.index({ projectId: 1, createdAt: -1 });
