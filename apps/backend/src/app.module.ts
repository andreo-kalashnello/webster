import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { WinstonModule } from "nest-winston";
import { join } from "node:path";

import { CleanupModule } from "./infra/cleanup/cleanup.module";
import { GqlThrottlerGuard } from "./infra/common/guards/gql-throttler.guard";
import { LoggingInterceptor } from "./infra/common/interceptors/logging.interceptor";
import { validate } from "./infra/config/env.validation";
import { createWinstonOptions } from "./infra/logger/logger.config";
import { MailModule } from "./infra/mail/mail.module";
import { OAuthModule } from "./infra/oauth/oauth.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { TemplatesModule } from "./modules/templates/templates.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createWinstonOptions(config.get("NODE_ENV") === "production"),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: "short", ttl: 1000, limit: 10 },
        { name: "medium", ttl: 10_000, limit: 50 },
        { name: "long", ttl: 60_000, limit: 200 },
      ],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("MONGODB_URI"),
      }),
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get("NODE_ENV") === "production";
        return {
          autoSchemaFile: join(process.cwd(), "src/infra/graphql/schema.gql"),
          path: "/graphql",
          introspection: !isProduction,
          context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
        };
      },
    }),
    MailModule,
    OAuthModule,
    HealthModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    TemplatesModule,
    AssetsModule,
    CleanupModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
