import { Type, plainToInstance } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from "class-validator";

export enum NodeEnv {
  Development = "development",
  Production = "production",
  Test = "test",
}

export class EnvSchema {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsNumber()
  @Type(() => Number)
  PORT = 4000;

  @IsString()
  @IsNotEmpty()
  MONGODB_URI!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET!: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN = "15m";

  @IsString()
  JWT_REFRESH_EXPIRES_IN = "30d";

  @IsNumber()
  @Type(() => Number)
  JWT_REFRESH_DAYS = 7;

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string;

  @IsString()
  FRONTEND_URL = "http://localhost:5173";

  @IsString()
  GRAPHQL_PLAYGROUND = "false";

  @IsString()
  APP_NAME = "Webster";

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  FACEBOOK_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  FACEBOOK_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  GITHUB_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  GITHUB_CLIENT_SECRET?: string;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvSchema, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
  });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((e) => Object.values(e.constraints ?? {}))
      .join("\n  - ");
    throw new Error(`Environment validation failed:\n  - ${messages}`);
  }

  return validated;
}
