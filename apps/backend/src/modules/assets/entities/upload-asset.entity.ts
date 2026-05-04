import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@ObjectType()
@Schema({ timestamps: true })
export class UploadAssetEntity extends Document {
  @Field(() => ID)
  declare id: string;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: "UserEntity", required: true, index: true })
  userId!: Types.ObjectId;

  @Field(() => ID, { nullable: true })
  @Prop({ type: Types.ObjectId, ref: "ProjectEntity", index: true, default: null })
  projectId?: Types.ObjectId | null;

  @Field()
  @Prop({ required: true })
  fileName!: string;

  @Field()
  @Prop({ required: true })
  originalName!: string;

  @Field()
  @Prop({ required: true })
  mimeType!: string;

  @Field(() => Int)
  @Prop({ required: true })
  size!: number;

  @Field()
  @Prop({ required: true })
  url!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

export const UploadAssetSchema = SchemaFactory.createForClass(UploadAssetEntity);

UploadAssetSchema.index({ userId: 1, createdAt: -1 });
UploadAssetSchema.index({ projectId: 1, createdAt: -1 });
