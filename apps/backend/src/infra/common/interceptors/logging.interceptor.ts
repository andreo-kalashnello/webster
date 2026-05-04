import {
    type CallHandler,
    type ExecutionContext,
    Injectable,
    Logger,
    type NestInterceptor,
} from "@nestjs/common";
import { GqlContextType, GqlExecutionContext } from "@nestjs/graphql";
import type { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();

    if (context.getType<GqlContextType>() === "graphql") {
      const gqlCtx = GqlExecutionContext.create(context);
      const info = gqlCtx.getInfo();
      const { req } = gqlCtx.getContext<{ req: import("express").Request & { requestId?: string } }>();
      const operationType = info?.operation?.operation ?? "query";
      const fieldName = info?.fieldName ?? "unknown";
      const requestId = req?.requestId ?? "-";

      return next.handle().pipe(
        tap({
          next: () => {
            this.logger.log(
              `[${requestId}] GQL ${operationType}.${fieldName} +${Date.now() - start}ms`,
            );
          },
          error: (err: Error) => {
            this.logger.warn(
              `[${requestId}] GQL ${operationType}.${fieldName} FAILED +${Date.now() - start}ms — ${err.message}`,
            );
          },
        }),
      );
    }

    // HTTP context (REST endpoints)
    const req = context.switchToHttp().getRequest<import("express").Request & { requestId?: string }>();
    const { method, url, requestId = "-" } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse<import("express").Response>();
          this.logger.log(
            `[${requestId}] ${method} ${url} ${res.statusCode} +${Date.now() - start}ms`,
          );
        },
        error: (err: Error) => {
          this.logger.warn(
            `[${requestId}] ${method} ${url} FAILED +${Date.now() - start}ms — ${err.message}`,
          );
        },
      }),
    );
  }
}
