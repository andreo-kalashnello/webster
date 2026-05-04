import {
    type ArgumentsHost,
    Catch,
    type ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import { GqlArgumentsHost, type GqlContextType } from "@nestjs/graphql";
import type { Request } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType<GqlContextType>() === "graphql") {
      const gqlHost = GqlArgumentsHost.create(host);
      const info = gqlHost.getInfo();
      const { req } = gqlHost.getContext<{ req: Request & { requestId?: string } }>();
      const requestId = req?.requestId ?? "-";

      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      const message =
        exception instanceof HttpException
          ? exception.message
          : "Internal server error";

      if (status >= 500) {
        this.logger.error(
          `[${requestId}] GraphQL ${info?.fieldName}: ${message}`,
          exception instanceof Error ? exception.stack : undefined,
        );
      } else if (status >= 400) {
        this.logger.warn(`[${requestId}] GraphQL ${info?.fieldName}: ${message} (${status})`);
      }

      // Re-throw for Apollo error formatting (no stack traces leak to client)
      if (exception instanceof HttpException) {
        throw exception;
      }

      throw new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // REST fallback (health checks, etc.)
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { requestId?: string }>();
    const response = ctx.getResponse();
    const requestId = req?.requestId ?? "-";

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : "Internal server error";

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${req?.method} ${req?.url}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= 400) {
      this.logger.warn(`[${requestId}] ${req?.method} ${req?.url}: ${message} (${status})`);
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
