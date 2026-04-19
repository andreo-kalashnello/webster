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
import { OAuthService } from "../src/infra/oauth/oauth.service";
import { AuthModule } from "../src/modules/auth/auth.module";
import { UsersModule } from "../src/modules/users/users.module";

const MONGO_URI =
  process.env.MONGO_E2E_URI ||
  "mongodb://webster:webster@localhost:27017/webster_e2e_test?authSource=admin";

let app: INestApplication;
let oauthService: OAuthService;

const GQL = "/graphql";

function gql(query: string, variables?: Record<string, any>) {
  return request(app.getHttpServer())
    .post(GQL)
    .send({ query, variables });
}

function gqlWithCookies(query: string, cookies: string[], variables?: Record<string, any>) {
  return request(app.getHttpServer())
    .post(GQL)
    .set("Cookie", cookies)
    .send({ query, variables });
}

function extractCookies(res: request.Response): string[] {
  const raw = res.headers["set-cookie"];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

beforeAll(async () => {
  // Check MongoDB availability
  try {
    const conn = await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
    await conn.connection.db?.dropDatabase();
    await conn.disconnect();
  } catch {
    console.warn("⚠ MongoDB not available at", MONGO_URI, "— e2e tests will be skipped. Start Docker Compose first.");
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
            PORT: 4000,
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
          autoSchemaFile: join(process.cwd(), "test/schema-test.gql"),
          path: "/graphql",
          context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
        }),
      }),
      MailModule,
      OAuthModule,
      UsersModule,
      AuthModule,
    ],
  }).compile();

  app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  oauthService = moduleRef.get(OAuthService);
}, 60_000);

afterAll(async () => {
  if (app) {
    // Clean up test database
    const conn = mongoose.connection;
    if (conn.readyState === 1) {
      await conn.db?.dropDatabase();
    }
    await app.close();
  }
});

// ─── Auth E2E ──────────────────────────────────────

describe("Auth E2E", () => {
  beforeEach(() => {
    if (!app) {
      pending("MongoDB not available — skipping");
    }
  });

  const testUser = {
    email: "e2e@test.com",
    password: "password123",
    firstName: "E2E",
    lastName: "Tester",
  };

  let cookies: string[] = [];

  describe("register", () => {
    it("should register a new user and set cookies", async () => {
      const res = await gql(`
        mutation {
          register(input: {
            email: "${testUser.email}"
            password: "${testUser.password}"
            firstName: "${testUser.firstName}"
            lastName: "${testUser.lastName}"
          }) { message }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.register.message).toContain("Registration successful");

      cookies = extractCookies(res);
      expect(cookies.length).toBeGreaterThanOrEqual(2);
      expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true);
      expect(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true);
    });

    it("should reject duplicate email", async () => {
      const res = await gql(`
        mutation {
          register(input: {
            email: "${testUser.email}"
            password: "${testUser.password}"
            firstName: "Dup"
            lastName: "User"
          }) { message }
        }
      `);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain("already exists");
    });

    it("should reject short password", async () => {
      const res = await gql(`
        mutation {
          register(input: {
            email: "short@test.com"
            password: "short"
            firstName: "S"
            lastName: "P"
          }) { message }
        }
      `);

      expect(res.body.errors).toBeDefined();
    });
  });

  describe("login", () => {
    it("should login with valid credentials", async () => {
      const res = await gql(`
        mutation {
          login(input: {
            email: "${testUser.email}"
            password: "${testUser.password}"
          }) { message }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.login.message).toContain("Login successful");

      cookies = extractCookies(res);
      expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true);
    });

    it("should reject wrong password", async () => {
      const res = await gql(`
        mutation {
          login(input: {
            email: "${testUser.email}"
            password: "wrong-password"
          }) { message }
        }
      `);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].message).toContain("Invalid email or password");
    });

    it("should reject non-existent email", async () => {
      const res = await gql(`
        mutation {
          login(input: {
            email: "noone@test.com"
            password: "password123"
          }) { message }
        }
      `);

      expect(res.body.errors).toBeDefined();
    });
  });

  describe("me (protected query)", () => {
    it("should return current user with valid cookies", async () => {
      const res = await gqlWithCookies(
        `query { me { id email firstName lastName } }`,
        cookies,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.me.email).toBe(testUser.email);
      expect(res.body.data.me.firstName).toBe(testUser.firstName);
    });

    it("should reject request without cookies", async () => {
      const res = await gql(`query { me { id email } }`);

      expect(res.body.errors).toBeDefined();
    });
  });

  describe("refreshToken", () => {
    it("should refresh tokens with valid refresh cookie", async () => {
      const res = await gqlWithCookies(
        `mutation { refreshToken { message } }`,
        cookies,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.refreshToken.message).toContain("Tokens refreshed");

      const newCookies = extractCookies(res);
      expect(newCookies.some((c) => c.startsWith("access_token="))).toBe(true);
      cookies = newCookies;
    });

    it("should reject without refresh cookie", async () => {
      const res = await gql(`mutation { refreshToken { message } }`);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe("changePassword", () => {
    it("should change password with correct current password", async () => {
      const res = await gqlWithCookies(
        `mutation {
          changePassword(input: {
            currentPassword: "${testUser.password}"
            newPassword: "newpassword123"
          }) { message }
        }`,
        cookies,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.changePassword.message).toContain("Password changed");

      // Login with new password
      const loginRes = await gql(`
        mutation {
          login(input: {
            email: "${testUser.email}"
            password: "newpassword123"
          }) { message }
        }
      `);
      expect(loginRes.body.data.login.message).toContain("Login successful");
      cookies = extractCookies(loginRes);
    });
  });

  describe("requestPasswordReset", () => {
    it("should return success for existing email (no enumeration)", async () => {
      const res = await gql(`
        mutation {
          requestPasswordReset(input: { email: "${testUser.email}" }) { message }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.requestPasswordReset.message).toContain("reset link");
    });

    it("should return same message for non-existing email", async () => {
      const res = await gql(`
        mutation {
          requestPasswordReset(input: { email: "fake@test.com" }) { message }
        }
      `);

      expect(res.status).toBe(200);
      expect(res.body.data.requestPasswordReset.message).toContain("reset link");
    });
  });

  describe("logout", () => {
    it("should logout and clear cookies", async () => {
      const res = await gqlWithCookies(
        `mutation { logout { message } }`,
        cookies,
      );

      expect(res.status).toBe(200);
      expect(res.body.data.logout.message).toContain("Logged out");

      const clearedCookies = extractCookies(res);
      const accessCookie = clearedCookies.find((c) => c.startsWith("access_token="));
      if (accessCookie) {
        // Cookie should be cleared (empty or expired)
        expect(accessCookie).toMatch(/access_token=;|Expires=Thu, 01 Jan 1970/i);
      }
    });
  });
});

// ─── OAuth E2E ─────────────────────────────────────

describe("OAuth E2E", () => {
  beforeEach(() => {
    if (!app) {
      pending("MongoDB not available — skipping");
    }
  });

  it("should create a new user via OAuth", async () => {
    jest.spyOn(oauthService, "getUserProfile").mockResolvedValue({
      id: "google-e2e-123",
      email: "oauth-e2e@test.com",
      firstName: "OAuth",
      lastName: "User",
      avatarUrl: "https://photo.test/pic.jpg",
    });

    const res = await gql(`
      mutation {
        oauthLogin(input: {
          provider: Google
          code: "fake-auth-code"
          redirectUri: "http://localhost:5173/callback"
        }) { message }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.data.oauthLogin.message).toContain("Login successful");

    const cookies = extractCookies(res);
    expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true);

    // Verify user was created — access me query
    const meRes = await gqlWithCookies(
      `query { me { email firstName lastName } }`,
      cookies,
    );

    expect(meRes.body.data.me.email).toBe("oauth-e2e@test.com");
    expect(meRes.body.data.me.firstName).toBe("OAuth");
  });

  it("should login existing OAuth user", async () => {
    jest.spyOn(oauthService, "getUserProfile").mockResolvedValue({
      id: "google-e2e-123",
      email: "oauth-e2e@test.com",
      firstName: "OAuth",
      lastName: "User",
    });

    const res = await gql(`
      mutation {
        oauthLogin(input: {
          provider: Google
          code: "another-code"
          redirectUri: "http://localhost:5173/callback"
        }) { message }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.data.oauthLogin.message).toContain("Login successful");
  });

  it("should link OAuth to existing email user", async () => {
    // Register a regular user first
    await gql(`
      mutation {
        register(input: {
          email: "linkable@test.com"
          password: "password123"
          firstName: "Link"
          lastName: "Able"
        }) { message }
      }
    `);

    // Now OAuth login with same email but different provider
    jest.spyOn(oauthService, "getUserProfile").mockResolvedValue({
      id: "github-link-456",
      email: "linkable@test.com",
      firstName: "Link",
      lastName: "Able",
    });

    const res = await gql(`
      mutation {
        oauthLogin(input: {
          provider: Github
          code: "link-code"
          redirectUri: "http://localhost:5173/callback"
        }) { message }
      }
    `);

    expect(res.status).toBe(200);
    expect(res.body.data.oauthLogin.message).toContain("Login successful");
  });

  it("should reject request with invalid provider enum", async () => {
    const res = await gql(`
      mutation {
        oauthLogin(input: {
          provider: InvalidProvider
          code: "code"
          redirectUri: "http://localhost:5173/callback"
        }) { message }
      }
    `);

    expect(res.body.errors).toBeDefined();
  });
});
