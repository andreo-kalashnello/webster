import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";

import { UsersModule } from "../users/users.module";
import { AuthResolver } from "./auth.resolver";
import { AuthService } from "./auth.service";
import { RefreshTokenEntity, RefreshTokenSchema } from "./entities/refresh-token.entity";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Module({
  imports: [
    forwardRef(() => UsersModule),
    MongooseModule.forFeature([
      { name: RefreshTokenEntity.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: config.get("JWT_ACCESS_EXPIRES_IN") || "15m",
        },
      }),
    }),
  ],
  providers: [AuthService, AuthResolver, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
