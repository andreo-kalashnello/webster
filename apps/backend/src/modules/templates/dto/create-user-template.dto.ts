import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import GraphQLJSON from "graphql-type-json";

@InputType()
export class CreateUserTemplateDto {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  width?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  height?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  content?: unknown;

  @Field({ nullable: true })
  @IsOptional()
  isPublic?: boolean;
}
