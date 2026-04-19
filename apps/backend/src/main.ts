import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./infra/common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = Number(process.env.PORT || 4000);
  const isProduction = config.get("NODE_ENV") === "production";

  app.use(helmet());

  app.use(cookieParser());

  app.use(mongoSanitize());

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
