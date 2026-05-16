import { Controller, Get, Module } from "@nestjs/common";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { registerGraphiQLRoutes } from "../src/infra/graphql/register-graphiql";

@Controller("graphql")
class TestGraphqlController {
  @Get()
  graphql() {
    return { ok: true };
  }
}

@Module({
  controllers: [TestGraphqlController],
})
class TestAppModule {}

describe("GraphiQL Smoke E2E", () => {
  let app: INestApplication;

  async function createApp(isProduction: boolean) {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    const nestApp = moduleRef.createNestApplication();
    registerGraphiQLRoutes(nestApp, isProduction);
    await nestApp.init();

    return nestApp;
  }

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("serves GraphiQL in non-production", async () => {
    app = await createApp(false);

    const res = await request(app.getHttpServer())
      .get("/graphiql")
      .expect(200);

    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("GraphiQL");
    expect(res.text).toContain("/graphql");
  });

  it("does not expose GraphiQL in production", async () => {
    app = await createApp(true);

    await request(app.getHttpServer())
      .get("/graphiql")
      .expect(404);
  });

  it("returns 204 for favicon in non-production", async () => {
    app = await createApp(false);

    await request(app.getHttpServer())
      .get("/favicon.ico")
      .expect(204);
  });
});
