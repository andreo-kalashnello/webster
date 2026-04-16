import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SystemStatus {
  @Field()
  api!: string;

  @Field()
  db!: string;

  @Field()
  timestamp!: string;
}
