import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, IsString, IsUrl, Max, Min, MinLength } from "class-validator";
import GraphQLJSON from "graphql-type-json";

@InputType()
export class UpdateProjectDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  width?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  height?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  content?: unknown;
}
