import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import GraphQLJSON from "graphql-type-json";

@InputType()
export class CreateProjectDto {
  @Field()
  @IsString()
  @MinLength(1)
  title!: string;

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

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  content?: unknown;
}
