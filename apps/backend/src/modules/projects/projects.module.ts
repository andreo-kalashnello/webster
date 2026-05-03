import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { ProjectVersionEntity, ProjectVersionSchema } from "./entities/project-version.entity";
import { ProjectEntity, ProjectSchema } from "./entities/project.entity";
import { ProjectsResolver } from "./projects.resolver";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProjectEntity.name, schema: ProjectSchema },
      { name: ProjectVersionEntity.name, schema: ProjectVersionSchema },
    ]),
    AuthModule,
    UsersModule,
  ],
  providers: [ProjectsService, ProjectsResolver],
  exports: [ProjectsService],
})
export class ProjectsModule {}
