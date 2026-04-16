import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";

import { SystemStatus } from "./health.model";

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getStatus(): SystemStatus {
    const readyState = this.connection.readyState;

    return {
      api: "ok",
      db: readyState === 1 ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    };
  }
}
