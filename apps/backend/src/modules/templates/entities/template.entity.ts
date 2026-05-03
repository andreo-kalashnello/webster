import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import GraphQLJSON from "graphql-type-json";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

@ObjectType()
@Schema({ timestamps: true })
export class TemplateEntity extends Document {
  @Field(() => ID)
  declare id: string;

  /** null = base (system) template; set = user-created template */
  @Field(() => ID, { nullable: true })
  @Prop({ type: Types.ObjectId, ref: "UserEntity", default: null, index: true })
  userId?: Types.ObjectId | null;

  @Field()
  @Prop({ required: true, trim: true, maxlength: 200 })
  title!: string;

  @Field({ nullable: true })
  @Prop()
  thumbnailUrl?: string;

  @Field(() => Int)
  @Prop({ required: true, default: 800 })
  width!: number;

  @Field(() => Int)
  @Prop({ required: true, default: 600 })
  height!: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  content?: unknown;

  @Field()
  @Prop({ default: false })
  isPublic!: boolean;

  @Prop({ default: false, index: true })
  isDeleted!: boolean;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

export const TemplateSchema = SchemaFactory.createForClass(TemplateEntity);

TemplateSchema.index({ userId: 1, isDeleted: 1 });
TemplateSchema.index({ isPublic: 1, isDeleted: 1 });
