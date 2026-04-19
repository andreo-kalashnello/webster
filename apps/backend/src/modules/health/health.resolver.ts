import { Query, Resolver } from "@nestjs/graphql";

import { SystemStatus } from "./health.model";
import { HealthService } from "./health.service";

@Resolver(() => SystemStatus)
export class HealthResolver {
  constructor(private readonly healthService: HealthService) {}

  @Query(() => SystemStatus)
  systemStatus(): SystemStatus {
    return this.healthService.getStatus();
  }
}
