import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { ThrottlerModule } from "@nestjs/throttler";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { join } from "node:path";
import request from "supertest";

import { MailModule } from "../src/infra/mail/mail.module";
import { OAuthModule } from "../src/infra/oauth/oauth.module";
import { AuthModule } from "../src/modules/auth/auth.module";
import { TemplateEntity } from "../src/modules/templates/entities/template.entity";
import { TemplatesModule } from "../src/modules/templates/templates.module";
import { UsersModule } from "../src/modules/users/users.module";

const MONGO_URI =
  process.env.MONGO_E2E_TEMPLATES_URI ||
  "mongodb://webster:webster@localhost:27017/webster_e2e_templates?authSource=admin";

let app: INestApplication;
let authCookies: string[] = [];
let otherCookies: string[] = [];

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
    console.warn("MongoDB not available — templates e2e will be skipped");
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
            PORT: 4002,
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
          autoSchemaFile: join(process.cwd(), "test/schema-templates-test.gql"),
          path: "/graphql",
          context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
        }),
      }),
      MailModule,
      UsersModule,
      AuthModule,
      OAuthModule,
      TemplatesModule,
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
        email: "tpl-user@test.com"
        password: "password123"
        firstName: "Tpl"
        lastName: "User"
      }) { message }
    }
  `);

  const loginRes = await gql(`
    mutation {
      login(input: { email: "tpl-user@test.com" password: "password123" }) { message }
    }
  `);
  authCookies = extractCookies(loginRes);

  await gql(`
    mutation {
      register(input: {
        email: "tpl-other@test.com"
        password: "password123"
        firstName: "Other"
        lastName: "User"
      }) { message }
    }
  `);

  const otherLoginRes = await gql(`
    mutation {
      login(input: { email: "tpl-other@test.com" password: "password123" }) { message }
    }
  `);
  otherCookies = extractCookies(otherLoginRes);

  const templateModel = moduleRef.get(getModelToken(TemplateEntity.name));
  await templateModel.create({
    userId: null,
    title: "Base Template",
    width: 800,
    height: 600,
    content: { shapes: [] },
    isPublic: false,
  });
}, 60_000);

afterAll(async () => {
  if (app) {
    const conn = mongoose.connection;
    if (conn.readyState === 1) await conn.db?.dropDatabase();
    await app.close();
  }
});

describe("Templates E2E", () => {
  beforeEach(() => {
    if (!app) pending("MongoDB not available — skipping");
  });

  let templateId: string;

  it("should return base templates", async () => {
    const res = await gqlAs(authCookies, `
      query {
        baseTemplates {
          id
          title
        }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.baseTemplates.length).toBeGreaterThanOrEqual(1);
  });

  it("should create user template", async () => {
    const res = await gqlAs(authCookies, `
      mutation {
        createUserTemplate(input: {
          title: "My Template"
          width: 1200
          height: 800
          content: { shapes: [{ type: "rect" }] }
        }) {
          id
          title
          width
          height
        }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createUserTemplate.title).toBe("My Template");

    templateId = res.body.data.createUserTemplate.id;
  });

  it("should list own user templates", async () => {
    const res = await gqlAs(authCookies, `
      query {
        userTemplates {
          id
          title
        }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.userTemplates.some((t: { id: string }) => t.id === templateId)).toBe(true);
  });

  it("should update user template", async () => {
    const res = await gqlAs(authCookies, `
      mutation {
        updateUserTemplate(id: "${templateId}" input: { title: "Updated Template" }) {
          id
          title
        }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.updateUserTemplate.title).toBe("Updated Template");
  });

  it("should deny update by non-owner", async () => {
    const res = await gqlAs(otherCookies, `
      mutation {
        updateUserTemplate(id: "${templateId}" input: { title: "Hacked" }) {
          id
        }
      }
    `);

    expect(res.body.errors).toBeDefined();
  });

  it("should create project from template", async () => {
    const res = await gqlAs(authCookies, `
      mutation {
        createProjectFromTemplate(templateId: "${templateId}" title: "From Template") {
          id
          title
          width
          height
        }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.createProjectFromTemplate.title).toBe("From Template");
  });

  it("should soft delete own template", async () => {
    const res = await gqlAs(authCookies, `
      mutation {
        deleteUserTemplate(id: "${templateId}")
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.deleteUserTemplate).toBe(true);
  });

  it("deleted template should not appear in userTemplates", async () => {
    const res = await gqlAs(authCookies, `
      query {
        userTemplates {
          id
        }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.userTemplates.some((t: { id: string }) => t.id === templateId)).toBe(false);
  });
});
