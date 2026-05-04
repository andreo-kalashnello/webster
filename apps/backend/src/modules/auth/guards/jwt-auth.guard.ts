import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

import { UsersService } from "../../users/users.service";

type RequestWithAuth = Request & { user?: unknown; cookies: Record<string, string> };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = this.getRequest(context);

    const token = req.cookies?.access_token;
    if (!token) {
      throw new UnauthorizedException("Missing authentication token");
    }

    try {
      const payload = this.jwtService.verify(token);
      req.user = await this.usersService.findById(payload.sub);
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  private getRequest(context: ExecutionContext): RequestWithAuth {
    if (context.getType<string>() === "http") {
      return context.switchToHttp().getRequest<RequestWithAuth>();
    }

    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
