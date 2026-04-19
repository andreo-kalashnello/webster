import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import type { Response } from "express";

import { clearAuthCookies, setAuthCookies } from "../../infra/common/utils/cookies";
import { UserEntity } from "../users/entities/user.entity";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { UseAuth } from "./decorators/use-auth.decorator";
import { MessageResponse, TwoFactorSetupResponse } from "./dto/auth.response";
import { LoginDto } from "./dto/login.dto";
import { RequestMagicLinkDto } from "./dto/magic-link.dto";
import { OAuthLoginDto } from "./dto/oauth-login.dto";
import {
  ChangePasswordDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from "./dto/password.dto";
import { RegisterDto } from "./dto/register.dto";

interface GqlContext {
  req: Express.Request;
  res: Response;
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  // ─── Public mutations ───────────────────────────────

  @Mutation(() => MessageResponse)
  async register(
    @Args("input") input: RegisterDto,
    @Context() ctx: GqlContext,
  ) {
    const tokens = await this.authService.register(input);
    setAuthCookies(ctx.res, this.authService.configService, tokens.accessToken, tokens.refreshToken, this.authService.refreshDays);
    return { message: "Registration successful" };
  }

  @Mutation(() => MessageResponse)
  async login(
    @Args("input") input: LoginDto,
    @Context() ctx: GqlContext,
  ) {
    const tokens = await this.authService.login(input.email, input.password, input.twoFactorCode);
    setAuthCookies(ctx.res, this.authService.configService, tokens.accessToken, tokens.refreshToken, this.authService.refreshDays);
    return { message: "Login successful" };
  }

  @Mutation(() => MessageResponse)
  async refreshToken(@Context() ctx: GqlContext) {
    const token = (ctx.req as any).cookies?.refresh_token;
    if (!token) {
      throw new Error("No refresh token");
    }
    const tokens = await this.authService.refreshToken(token);
    setAuthCookies(ctx.res, this.authService.configService, tokens.accessToken, tokens.refreshToken, this.authService.refreshDays);
    return { message: "Tokens refreshed" };
  }

  @Mutation(() => MessageResponse)
  async oauthLogin(
    @Args("input") input: OAuthLoginDto,
    @Context() ctx: GqlContext,
  ) {
    const tokens = await this.authService.oauthLogin(input.provider, input.code, input.redirectUri);
    setAuthCookies(ctx.res, this.authService.configService, tokens.accessToken, tokens.refreshToken, this.authService.refreshDays);
    return { message: "Login successful" };
  }

  @Mutation(() => MessageResponse)
  verifyEmail(@Args("token") token: string) {
    return this.authService.verifyEmail(token);
  }

  @Mutation(() => MessageResponse)
  requestPasswordReset(
    @Args("input") input: RequestPasswordResetDto,
  ) {
    return this.authService.requestPasswordReset(input.email);
  }

  @Mutation(() => MessageResponse)
  resetPassword(@Args("input") input: ResetPasswordDto) {
    return this.authService.resetPassword(input);
  }

  @Mutation(() => MessageResponse)
  requestMagicLink(@Args("input") input: RequestMagicLinkDto) {
    return this.authService.requestMagicLink(input.email);
  }

  @Mutation(() => MessageResponse)
  async verifyMagicLink(
    @Args("token") token: string,
    @Context() ctx: GqlContext,
  ) {
    const tokens = await this.authService.verifyMagicLink(token);
    setAuthCookies(ctx.res, this.authService.configService, tokens.accessToken, tokens.refreshToken, this.authService.refreshDays);
    return { message: "Login successful" };
  }

  // ─── Protected mutations ────────────────────────────

  @Mutation(() => MessageResponse)
  @UseAuth()
  logout(
    @CurrentUser() user: UserEntity,
    @Context() ctx: GqlContext,
  ) {
    clearAuthCookies(ctx.res, this.authService.configService);
    return this.authService.logout(user.id);
  }

  @Mutation(() => MessageResponse)
  @UseAuth()
  changePassword(
    @CurrentUser() user: UserEntity,
    @Args("input") input: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, input);
  }

  // ─── 2FA mutations ─────────────────────────────────

  @Mutation(() => TwoFactorSetupResponse)
  @UseAuth()
  generateTwoFactorSecret(@CurrentUser() user: UserEntity) {
    return this.authService.generateTwoFactorSecret(user.id);
  }

  @Mutation(() => MessageResponse)
  @UseAuth()
  enableTwoFactor(
    @CurrentUser() user: UserEntity,
    @Args("code") code: string,
  ) {
    return this.authService.enableTwoFactor(user.id, code);
  }

  @Mutation(() => MessageResponse)
  @UseAuth()
  disableTwoFactor(
    @CurrentUser() user: UserEntity,
    @Args("password") password: string,
  ) {
    return this.authService.disableTwoFactor(user.id, password);
  }
}
