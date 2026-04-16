import { Query, Resolver } from "@nestjs/graphql";

import { HealthService } from "./health.service";
import { SystemStatus } from "./health.model";

@Resolver(() => SystemStatus)
export class HealthResolver {
  constructor(private readonly healthService: HealthService) {}

  @Query(() => SystemStatus)
  systemStatus(): SystemStatus {
    return this.healthService.getStatus();
  }
}
