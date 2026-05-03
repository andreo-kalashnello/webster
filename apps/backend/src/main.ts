import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import express from "express";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { join } from "node:path";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./infra/common/filters/http-exception.filter";
import { requestIdMiddleware } from "./infra/common/middleware/request-id.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const port = Number(process.env.PORT || 4000);
  const isProduction = config.get("NODE_ENV") === "production";

  // Use Winston as the NestJS logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.use(helmet());

  app.use(cookieParser());

  // Attach a unique request ID to every request
  app.use(requestIdMiddleware);

  app.use("/uploads", express.static(join(process.cwd(), "uploads")));
  app.use("/exports", express.static(join(process.cwd(), "exports")));

  // express-mongo-sanitize@2.2.0 hardcodes req.query mutation, which Express 5 disallows.
  // Use the sanitize() function directly on body/params to avoid touching the read-only getter.
  app.use((req: import("express").Request, _res: import("express").Response, next: import("express").NextFunction) => {
    if (req.body) req.body = mongoSanitize.sanitize(req.body as Record<string, unknown>);
    if (req.params) req.params = mongoSanitize.sanitize(req.params as Record<string, unknown>) as Record<string, string>;
    next();
  });

  const allowedOrigins = config.get<string>("FRONTEND_URL")!;
  app.enableCors({
    origin: isProduction ? allowedOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port, "0.0.0.0");
  Logger.log(`Backend started on http://0.0.0.0:${port}`, "Bootstrap");
}

bootstrap();
