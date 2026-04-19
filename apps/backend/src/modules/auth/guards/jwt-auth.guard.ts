import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { JwtService } from "@nestjs/jwt";

import { UsersService } from "../../users/users.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;

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
}
