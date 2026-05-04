import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import GraphQLJSON from "graphql-type-json";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

@ObjectType()
@Schema({ timestamps: true })
export class ProjectEntity extends Document {
  @Field(() => ID)
  declare id: string;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: "UserEntity", required: true, index: true })
  userId!: Types.ObjectId;

  @Field()
  @Prop({ required: true, trim: true, maxlength: 200 })
  title!: string;

  @Field(() => Int)
  @Prop({ required: true, default: 800 })
  width!: number;

  @Field(() => Int)
  @Prop({ required: true, default: 600 })
  height!: number;

  @Field({ nullable: true })
  @Prop()
  thumbnailUrl?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  content?: unknown;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(ProjectEntity);

ProjectSchema.index({ userId: 1, updatedAt: -1 });
ProjectSchema.index({ userId: 1, isDeleted: 1 });
