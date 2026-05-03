import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import GraphQLJSON from "graphql-type-json";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

@ObjectType()
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ProjectVersionEntity extends Document {
  @Field(() => ID)
  declare id: string;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: "ProjectEntity", required: true, index: true })
  projectId!: Types.ObjectId;

  @Field(() => ID)
  @Prop({ type: Types.ObjectId, ref: "UserEntity", required: true })
  userId!: Types.ObjectId;

  @Field({ nullable: true })
  @Prop({ trim: true, maxlength: 100 })
  label?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @Prop({ type: MongooseSchema.Types.Mixed })
  content?: unknown;

  @Field()
  createdAt!: Date;
}

export const ProjectVersionSchema = SchemaFactory.createForClass(ProjectVersionEntity);

ProjectVersionSchema.index({ projectId: 1, createdAt: -1 });
