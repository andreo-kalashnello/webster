import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../auth/auth.module";
import { ProjectEntity, ProjectSchema } from "../projects/entities/project.entity";
import { UsersModule } from "../users/users.module";
import { TemplateEntity, TemplateSchema } from "./entities/template.entity";
import { TemplatesResolver } from "./templates.resolver";
import { TemplatesService } from "./templates.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TemplateEntity.name, schema: TemplateSchema },
      { name: ProjectEntity.name, schema: ProjectSchema },
    ]),
    AuthModule,
    UsersModule,
  ],
  providers: [TemplatesService, TemplatesResolver],
  exports: [TemplatesService],
})
export class TemplatesModule {}
