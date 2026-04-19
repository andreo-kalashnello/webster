import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule } from "@nestjs/throttler";
import { join } from "node:path";

import { GqlThrottlerGuard } from "./infra/common/guards/gql-throttler.guard";
import { validate } from "./infra/config/env.validation";
import { MailModule } from "./infra/mail/mail.module";
import { OAuthModule } from "./infra/oauth/oauth.module";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
})
export class AppModule {}
