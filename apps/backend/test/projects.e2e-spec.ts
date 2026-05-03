import { type INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import request from "supertest";

import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { ThrottlerModule } from "@nestjs/throttler";
import { join } from "node:path";
import { MailModule } from "../src/infra/mail/mail.module";
import { OAuthModule } from "../src/infra/oauth/oauth.module";
import { AuthModule } from "../src/modules/auth/auth.module";
import { ProjectsModule } from "../src/modules/projects/projects.module";
import { UsersModule } from "../src/modules/users/users.module";

const MONGO_URI =
  process.env.MONGO_E2E_PROJECTS_URI ||
  "mongodb://webster:webster@localhost:27017/webster_e2e_projects?authSource=admin";

let app: INestApplication;
let authCookies: string[] = [];
let otherCookies: string[] = [];

const GQL = "/graphql";

function gql(query: string, variables?: Record<string, any>) {
  return request(app.getHttpServer()).post(GQL).send({ query, variables });
}

function gqlAs(cookies: string[], query: string, variables?: Record<string, any>) {
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
    console.warn("⚠ MongoDB not available — projects e2e will be skipped");
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
            PORT: 4001,
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
          autoSchemaFile: join(process.cwd(), "test/schema-projects-test.gql"),
          path: "/graphql",
          context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
        }),
      }),
      MailModule,
      UsersModule,
      AuthModule,
      OAuthModule,
      ProjectsModule,
    ],
  }).compile();

  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  await app.init();

  // Register & login main test user
  await gql(`
    mutation {
      register(input: {
        email: "proj-user@test.com"
        password: "password123"
        firstName: "Proj"
        lastName: "User"
      }) { message }
    }
  `);
  const loginRes = await gql(`
    mutation {
      login(input: { email: "proj-user@test.com" password: "password123" }) { message }
    }
  `);
  authCookies = extractCookies(loginRes);

  // Register & login second user (for ownership tests)
  await gql(`
    mutation {
      register(input: {
        email: "other-user@test.com"
        password: "password123"
        firstName: "Other"
        lastName: "User"
      }) { message }
    }
  `);
  const otherRes = await gql(`
    mutation {
      login(input: { email: "other-user@test.com" password: "password123" }) { message }
    }
  `);
  otherCookies = extractCookies(otherRes);
}, 60_000);

afterAll(async () => {
  if (app) {
    const conn = mongoose.connection;
    if (conn.readyState === 1) await conn.db?.dropDatabase();
    await app.close();
  }
});

// ─── Projects E2E ─────────────────────────────────

describe("Projects E2E", () => {
  beforeEach(() => {
    if (!app) pending("MongoDB not available — skipping");
  });

  let projectId: string;
  let versionId: string;

  describe("createProject", () => {
    it("should create a project with default dimensions", async () => {
      const res = await gqlAs(authCookies, `
        mutation {
          createProject(input: { title: "My Canvas" }) {
            id title width height
          }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.createProject.title).toBe("My Canvas");
      expect(res.body.data.createProject.width).toBe(800);
      expect(res.body.data.createProject.height).toBe(600);

      projectId = res.body.data.createProject.id;
    });

    it("should create a project with custom dimensions", async () => {
      const res = await gqlAs(authCookies, `
        mutation {
          createProject(input: { title: "Landscape" width: 1920 height: 1080 }) {
            id title width height
          }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.createProject.width).toBe(1920);
      expect(res.body.data.createProject.height).toBe(1080);
    });

    it("should require authentication", async () => {
      const res = await gql(`
        mutation {
          createProject(input: { title: "Anon" }) { id }
        }
      `);

      expect(res.body.errors).toBeDefined();
    });

    it("should reject missing title", async () => {
      const res = await gqlAs(authCookies, `
        mutation {
          createProject(input: { title: "" }) { id }
        }
      `);

      expect(res.body.errors).toBeDefined();
    });
  });

  describe("projects (list)", () => {
    it("should return paginated list of user projects", async () => {
      const res = await gqlAs(authCookies, `
        query {
          projects(pagination: { page: 1 limit: 10 }) {
            items { id title }
            total
            page
            totalPages
          }
        }
      `);

      expect(res.status).toBe(200);
      const data = res.body.data.projects;
      expect(data.items.length).toBeGreaterThanOrEqual(1);
      expect(data.total).toBeGreaterThanOrEqual(1);
      expect(data.page).toBe(1);
    });

    it("should not include other users projects", async () => {
      const res = await gqlAs(otherCookies, `
        query {
          projects { items { id title } total }
        }
      `);

      expect(res.status).toBe(200);
      // other user has no projects yet
      expect(res.body.data.projects.total).toBe(0);
    });

    it("should require authentication", async () => {
      const res = await gql(`query { projects { items { id } total } }`);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe("project (by id)", () => {
    it("should return project by id for owner", async () => {
      const res = await gqlAs(authCookies, `
        query {
          project(id: "${projectId}") { id title width height }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.project.id).toBe(projectId);
    });

    it("should deny access to other user's project", async () => {
      const res = await gqlAs(otherCookies, `
        query {
          project(id: "${projectId}") { id }
        }
      `);

      expect(res.body.errors).toBeDefined();
    });

    it("should require authentication", async () => {
      const res = await gql(`query { project(id: "${projectId}") { id } }`);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe("updateProject", () => {
    it("should update project title", async () => {
      const res = await gqlAs(authCookies, `
        mutation {
          updateProject(id: "${projectId}" input: { title: "Renamed Canvas" }) {
            id title
          }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.updateProject.title).toBe("Renamed Canvas");
    });

    it("should deny update by non-owner", async () => {
      const res = await gqlAs(otherCookies, `
        mutation {
          updateProject(id: "${projectId}" input: { title: "Hacked" }) { id }
        }
      `);

      expect(res.body.errors).toBeDefined();
    });
  });

  describe("autosaveProject", () => {
    it("should save canvas content and thumbnail", async () => {
      const res = await gqlAs(authCookies, `
        mutation {
          autosaveProject(
            id: "${projectId}"
            content: { shapes: [{ type: "rect" }] }
            thumbnailUrl: "https://cdn.test/thumb.png"
          ) {
            id thumbnailUrl
          }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.autosaveProject.thumbnailUrl).toBe("https://cdn.test/thumb.png");
    });

    it("should deny autosave by non-owner", async () => {
      const res = await gqlAs(otherCookies, `
        mutation {
          autosaveProject(id: "${projectId}" content: {}) { id }
        }
      `);

      expect(res.body.errors).toBeDefined();
    });
  });

  describe("cloneProject", () => {
    let clonedId: string;

    it("should clone a project", async () => {
      const res = await gqlAs(authCookies, `
        mutation {
          cloneProject(id: "${projectId}") { id title }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.cloneProject.title).toContain("(copy)");
      expect(res.body.data.cloneProject.id).not.toBe(projectId);

      clonedId = res.body.data.cloneProject.id;
    });

    it("should deny clone of other user's project", async () => {
      const res = await gqlAs(otherCookies, `
        mutation {
          cloneProject(id: "${projectId}") { id }
        }
      `);

      expect(res.body.errors).toBeDefined();
    });

    it("cloned project appears in list", async () => {
      const res = await gqlAs(authCookies, `
        query { projects { total } }
      `);

      expect(res.body.data.projects.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe("deleteProject", () => {
    it("should deny delete by non-owner", async () => {
      const res = await gqlAs(otherCookies, `
        mutation { deleteProject(id: "${projectId}") }
      `);

      expect(res.body.errors).toBeDefined();
    });

    it("should soft-delete a project", async () => {
      const res = await gqlAs(authCookies, `
        mutation { deleteProject(id: "${projectId}") }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.deleteProject).toBe(true);
    });

    it("deleted project should not appear in list", async () => {
      const res = await gqlAs(authCookies, `
        query { project(id: "${projectId}") { id } }
      `);

      expect(res.body.errors).toBeDefined();
    });
  });

  describe("versions", () => {
    let versionsProjectId: string;

    it("should create a project version", async () => {
      const projectRes = await gqlAs(authCookies, `
        mutation {
          createProject(input: { title: "Versioned Project" }) {
            id
          }
        }
      `);
      expect(projectRes.body.errors).toBeUndefined();
      versionsProjectId = projectRes.body.data.createProject.id;

      const saveRes = await gqlAs(authCookies, `
        mutation {
          autosaveProject(
            id: "${versionsProjectId}"
            content: { shapes: [{ type: "circle", radius: 40 }] }
          ) { id }
        }
      `);
      expect(saveRes.body.errors).toBeUndefined();

      const res = await gqlAs(authCookies, `
        mutation {
          createVersion(projectId: "${versionsProjectId}" label: "Checkpoint 1") {
            id
            projectId
            label
            content
          }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.createVersion.projectId).toBe(versionsProjectId);
      expect(res.body.data.createVersion.label).toBe("Checkpoint 1");
      expect(res.body.data.createVersion.content.shapes[0].type).toBe("circle");

      versionId = res.body.data.createVersion.id;
    });

    it("should list versions for owner", async () => {
      const res = await gqlAs(authCookies, `
        query {
          versions(projectId: "${versionsProjectId}") {
            id
            label
            createdAt
          }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.versions.length).toBeGreaterThanOrEqual(1);
    });

    it("should deny versions list for non-owner", async () => {
      const res = await gqlAs(otherCookies, `
        query {
          versions(projectId: "${versionsProjectId}") {
            id
          }
        }
      `);

      expect(res.body.errors).toBeDefined();
    });

    it("should restore project from selected version", async () => {
      const mutateRes = await gqlAs(authCookies, `
        mutation {
          autosaveProject(
            id: "${versionsProjectId}"
            content: { shapes: [{ type: "triangle" }] }
          ) { id }
        }
      `);
      expect(mutateRes.body.errors).toBeUndefined();

      const restoreRes = await gqlAs(authCookies, `
        mutation {
          restoreVersion(projectId: "${versionsProjectId}" versionId: "${versionId}") {
            id
            content
          }
        }
      `);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.errors).toBeUndefined();
      expect(restoreRes.body.data.restoreVersion.content.shapes[0].type).toBe("circle");
    });

    it("should deny restore by non-owner", async () => {
      const res = await gqlAs(otherCookies, `
        mutation {
          restoreVersion(projectId: "${versionsProjectId}" versionId: "${versionId}") {
            id
          }
        }
      `);

      expect(res.body.errors).toBeDefined();
    });
  });
});
