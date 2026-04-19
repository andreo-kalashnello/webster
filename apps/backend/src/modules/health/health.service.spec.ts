import { getConnectionToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";

import { HealthService } from "./health.service";

describe("HealthService", () => {
  let service: HealthService;
  let mockConnection: { readyState: number };

  beforeEach(async () => {
    mockConnection = { readyState: 1 };

    const module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it("should return ok status when DB is connected", () => {
    const status = service.getStatus();

    expect(status.api).toBe("ok");
    expect(status.db).toBe("connected");
    expect(status.timestamp).toBeDefined();
  });

  it("should return disconnected when DB readyState != 1", () => {
    mockConnection.readyState = 0;

    const status = service.getStatus();

    expect(status.api).toBe("ok");
    expect(status.db).toBe("disconnected");
  });
});
