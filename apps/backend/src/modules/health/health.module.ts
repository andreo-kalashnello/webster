import { Module } from "@nestjs/common";

import { HealthController } from "./health.controller";
import { HealthResolver } from "./health.resolver";
import { HealthService } from "./health.service";

@Module({
  controllers: [HealthController],
  providers: [HealthResolver, HealthService],
})
export class HealthModule {}
