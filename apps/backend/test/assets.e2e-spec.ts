import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { MongooseModule } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { ThrottlerModule } from "@nestjs/throttler";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { join } from "node:path";
import request from "supertest";

import { MailModule } from "../src/infra/mail/mail.module";
import { OAuthModule } from "../src/infra/oauth/oauth.module";
import { AssetsModule } from "../src/modules/assets/assets.module";
import { AuthModule } from "../src/modules/auth/auth.module";
import { ProjectsModule } from "../src/modules/projects/projects.module";
import { UsersModule } from "../src/modules/users/users.module";

const MONGO_URI =
  process.env.MONGO_E2E_ASSETS_URI ||
  "mongodb://webster:webster@localhost:27017/webster_e2e_assets?authSource=admin";

let app: INestApplication;
let authCookies: string[] = [];
let otherCookies: string[] = [];
let projectId: string;
let shareToken: string;

const GQL = "/graphql";

function gql(query: string, variables?: Record<string, unknown>) {
  return request(app.getHttpServer()).post(GQL).send({ query, variables });
}

function gqlAs(cookies: string[], query: string, variables?: Record<string, unknown>) {
  return request(app.getHttpServer()).post(GQL).set("Cookie", cookies).send({ query, variables });
}

function extractCookies(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

beforeAll(async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
    await conn.connection.db?.dropDatabase();
    await conn.disconnect();
  } catch {
    console.warn("MongoDB not available — assets e2e will be skipped");
    return;
  }

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            NODE_ENV: "test",
            PORT: 4003,
            MONGODB_URI: MONGO_URI,
            JWT_ACCESS_SECRET: "test-access-secret",
            JWT_REFRESH_SECRET: "test-refresh-secret",
            JWT_ACCESS_EXPIRES_IN: "15m",
            JWT_REFRESH_EXPIRES_IN: "30d",
            JWT_REFRESH_DAYS: 7,
            FRONTEND_URL: "http://localhost:5173",
            APP_NAME: "Webster",
          }),
        ],
      }),
      MongooseModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          uri: config.get<string>("MONGODB_URI"),
        }),
      }),
      ThrottlerModule.forRoot({
        throttlers: [{ name: "short", ttl: 1000, limit: 100 }],
      }),
      GraphQLModule.forRootAsync<ApolloDriverConfig>({
        driver: ApolloDriver,
        inject: [ConfigService],
        useFactory: () => ({
          autoSchemaFile: join(process.cwd(), "test/schema-assets-test.gql"),
          path: "/graphql",
          context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
        }),
      }),
      MailModule,
      UsersModule,
      AuthModule,
      OAuthModule,
      ProjectsModule,
      AssetsModule,
    ],
  }).compile();

  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  await app.init();

  await gql(`
    mutation {
      register(input: {
        email: "asset-user@test.com"
        password: "password123"
        firstName: "Asset"
        lastName: "User"
      }) { message }
    }
  `);
  const loginRes = await gql(`
    mutation {
      login(input: { email: "asset-user@test.com" password: "password123" }) { message }
    }
  `);
  authCookies = extractCookies(loginRes);

  await gql(`
    mutation {
      register(input: {
        email: "asset-other@test.com"
        password: "password123"
        firstName: "Other"
        lastName: "User"
      }) { message }
    }
  `);
  const otherRes = await gql(`
    mutation {
      login(input: { email: "asset-other@test.com" password: "password123" }) { message }
    }
  `);
  otherCookies = extractCookies(otherRes);

  const projectRes = await gqlAs(authCookies, `
    mutation {
      createProject(input: { title: "Asset Project" }) { id }
    }
  `);
  projectId = projectRes.body.data.createProject.id;
}, 60_000);

afterAll(async () => {
  if (app) {
    const conn = mongoose.connection;
    if (conn.readyState === 1) await conn.db?.dropDatabase();
    await app.close();
  }
});

describe("Assets E2E", () => {
  beforeEach(() => {
    if (!app) pending("MongoDB not available — skipping");
  });

  it("should create share link", async () => {
    const res = await gqlAs(authCookies, `
      mutation {
        createShareLink(projectId: "${projectId}", expiresInHours: 24) {
          token
          url
        }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createShareLink.url).toContain("/share/");

    shareToken = res.body.data.createShareLink.token;
  });

  it("should resolve share link without auth", async () => {
    const res = await gql(`
      query {
        resolveShareLink(token: "${shareToken}") {
          id
          title
        }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.resolveShareLink.id).toBe(projectId);
  });

  it("should export pdf for owner", async () => {
    const res = await gqlAs(authCookies, `
      mutation {
        exportPdf(projectId: "${projectId}") {
          fileName
          mimeType
          url
        }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.exportPdf.mimeType).toBe("application/pdf");
    expect(res.body.data.exportPdf.url).toContain("/exports/");
  });

  it("should deny export for non-owner", async () => {
    const res = await gqlAs(otherCookies, `
      mutation {
        exportPdf(projectId: "${projectId}") {
          url
        }
      }
    `);

    expect(res.body.errors).toBeDefined();
  });

  it("should upload png file via REST endpoint", async () => {
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9s4Nn0QAAAABJRU5ErkJggg==";

    const res = await request(app.getHttpServer())
      .post("/upload")
      .set("Cookie", authCookies)
      .field("projectId", projectId)
      .attach("file", Buffer.from(pngBase64, "base64"), {
        filename: "pixel.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(201);
    expect(res.body.url).toContain("/uploads/");
    expect(res.body.mimeType).toBe("image/png");
  });

  it("should reject unsupported upload type", async () => {
    const res = await request(app.getHttpServer())
      .post("/upload")
      .set("Cookie", authCookies)
      .attach("file", Buffer.from("plain text"), {
        filename: "a.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
