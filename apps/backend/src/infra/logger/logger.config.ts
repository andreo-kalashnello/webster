import { utilities as nestWinstonUtilities } from "nest-winston";
import winston from "winston";

const { combine, timestamp, ms, errors } = winston.format;

export function createWinstonOptions(isProduction: boolean): winston.LoggerOptions {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction
        ? combine(
            errors({ stack: true }),
            timestamp(),
            winston.format.json(),
          )
        : combine(
            errors({ stack: true }),
            timestamp(),
            ms(),
            nestWinstonUtilities.format.nestLike("Webster", {
              prettyPrint: true,
              colors: true,
            }),
          ),
    }),
  ];

  return {
    level: isProduction ? "info" : "debug",
    transports,
  };
}
