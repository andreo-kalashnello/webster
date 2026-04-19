import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { type Model } from "mongoose";
import { randomUUID } from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import * as QRCode from "qrcode";

import { hash, verify } from "../../infra/common/utils/hashing";
import { MailService } from "../../infra/mail/mail.service";
import { OAuthService } from "../../infra/oauth/oauth.service";
import type { OAuthProvider } from "../users/entities/user.entity";
import { UsersService } from "../users/users.service";
import type { MessageResponse, TwoFactorSetupResponse } from "./dto/auth.response";
import type { ChangePasswordDto, ResetPasswordDto } from "./dto/password.dto";
import type { RegisterDto } from "./dto/register.dto";
import { RefreshTokenEntity } from "./entities/refresh-token.entity";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly oauthService: OAuthService,
    @InjectModel(RefreshTokenEntity.name) private refreshTokenModel: Model<RefreshTokenEntity>,
  ) {}

  get refreshDays() {
    return this.configService.get<number>("JWT_REFRESH_DAYS", 7);
  }

  // ─── Register ────────────────────────────────────────

  async register(input: RegisterDto): Promise<TokenPair> {
    const existing = await this.usersService.findByEmail(input.email);
    if (existing) {
      throw new ConflictException("User with this email already exists");
    }

    const passwordHash = await hash(input.password);

    const user = await this.usersService.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    // Send verification email (fire-and-forget)
    this.sendVerificationEmail(user.id, user.email).catch(() => {});

    return this.generateTokens(user.id);
  }

  // ─── Login ───────────────────────────────────────────

  async login(
    email: string,
    password: string,
    twoFactorCode?: string,
  ): Promise<TokenPair> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException("This account uses OAuth login");
    }

    const isPasswordValid = await verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.isTwoFactorEnabled) {
      if (!twoFactorCode) {
        throw new BadRequestException("Two-factor authentication code is required");
      }
      if (!user.twoFactorSecret) {
        throw new BadRequestException("Two-factor is enabled but not configured");
      }
      const result = verifySync({ token: twoFactorCode, secret: user.twoFactorSecret });
      if (!result.valid) {
        throw new UnauthorizedException("Invalid two-factor authentication code");
      }
    }

    return this.generateTokens(user.id);
  }

  // ─── Refresh Token ──────────────────────────────────

  async refreshToken(token: string): Promise<TokenPair> {
    // Find a matching non-revoked token by iterating hashes
    const allTokens = await this.refreshTokenModel
      .find({ isRevoked: false, expiresAt: { $gt: new Date() } })
      .exec();

    let matchedToken: RefreshTokenEntity | null = null;
    for (const t of allTokens) {
      const isMatch = await verify(t.tokenHash, token);
      if (isMatch) {
        matchedToken = t;
        break;
      }
    }

    if (!matchedToken) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Revoke used token (rotation)
    matchedToken.isRevoked = true;
    await matchedToken.save();

    return this.generateTokens(matchedToken.userId.toString());
  }

  // ─── Logout ─────────────────────────────────────────

  async logout(userId: string): Promise<MessageResponse> {
    await this.refreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
    return { message: "Logged out successfully" };
  }

  // ─── Email Verification ─────────────────────────────

  async verifyEmail(token: string): Promise<MessageResponse> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.getJwtSecret(),
      });
      if (payload.type !== "email-verification") {
        throw new BadRequestException("Invalid verification token");
      }
      await this.usersService.verifyEmail(payload.sub);
      return { message: "Email verified successfully" };
    } catch {
      throw new BadRequestException("Invalid or expired verification token");
    }
  }

  // ─── Password Recovery ──────────────────────────────

  async requestPasswordReset(email: string): Promise<MessageResponse> {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) {
      return { message: "If the email exists, a reset link has been sent" };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, type: "password-reset" },
      { secret: this.getJwtSecret(), expiresIn: "1h" } as any,
    );

    // TODO: Send actual email with reset link
    this.mailService.sendPasswordReset(email, resetToken).catch(() => {});

    return { message: "If the email exists, a reset link has been sent" };
  }

  async resetPassword(input: ResetPasswordDto): Promise<MessageResponse> {
    try {
      const payload = this.jwtService.verify(input.token, {
        secret: this.getJwtSecret(),
      });
      if (payload.type !== "password-reset") {
        throw new BadRequestException("Invalid reset token");
      }
      const passwordHash = await hash(input.newPassword);
      await this.usersService.setPassword(payload.sub, passwordHash);

      // Revoke all refresh tokens for security
      await this.refreshTokenModel.updateMany(
        { userId: payload.sub, isRevoked: false },
        { isRevoked: true },
      );

      return { message: "Password reset successfully" };
    } catch {
      throw new BadRequestException("Invalid or expired reset token");
    }
  }

  async changePassword(
    userId: string,
    input: ChangePasswordDto,
  ): Promise<MessageResponse> {
    const user = await this.usersService.findById(userId);
    if (!user.passwordHash) {
      throw new BadRequestException("This account uses OAuth login. Set a password first.");
    }
    const isValid = await verify(user.passwordHash, input.currentPassword);
    if (!isValid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const passwordHash = await hash(input.newPassword);
    await this.usersService.setPassword(userId, passwordHash);

    return { message: "Password changed successfully" };
  }

  // ─── 2FA ────────────────────────────────────────────

  async generateTwoFactorSecret(userId: string): Promise<TwoFactorSetupResponse> {
    const user = await this.usersService.findById(userId);
    const secret = generateSecret();
    const appName = this.configService.get<string>("APP_NAME", "Webster");

    const otpauthUrl = generateURI({ issuer: appName, label: user.email, secret });
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    await this.usersService.setTwoFactorSecret(userId, secret);

    return { secret, qrCodeUrl };
  }

  async enableTwoFactor(userId: string, code: string): Promise<MessageResponse> {
    const user = await this.usersService.findById(userId);
    if (!user.twoFactorSecret) {
      throw new BadRequestException("Generate a 2FA secret first");
    }

    const result = verifySync({
      token: code,
      secret: user.twoFactorSecret,
    });
    if (!result.valid) {
      throw new BadRequestException("Invalid 2FA code");
    }

    await this.usersService.enableTwoFactor(userId);
    return { message: "Two-factor authentication enabled" };
  }

  async disableTwoFactor(
    userId: string,
    password: string,
  ): Promise<MessageResponse> {
    const user = await this.usersService.findById(userId);
    if (!user.passwordHash) {
      throw new BadRequestException("This account uses OAuth login. Set a password first.");
    }
    const isValid = await verify(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedException("Invalid password");
    }

    await this.usersService.disableTwoFactor(userId);
    return { message: "Two-factor authentication disabled" };
  }

  // ─── Magic Link ─────────────────────────────────────

  async requestMagicLink(email: string): Promise<MessageResponse> {
    const user = await this.usersService.findByEmail(email);
    // Always return success to prevent email enumeration
    if (!user) {
      return { message: "If the email exists, a magic link has been sent" };
    }

    const token = this.jwtService.sign(
      { sub: user.id, type: "magic-link" },
      { secret: this.getJwtSecret(), expiresIn: "15m" } as any,
    );

    this.mailService.sendMagicLink(email, token).catch(() => {});

    return { message: "If the email exists, a magic link has been sent" };
  }

  async verifyMagicLink(token: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.getJwtSecret(),
      });
      if (payload.type !== "magic-link") {
        throw new BadRequestException("Invalid magic link token");
      }

      // Auto-verify email on magic link login
      const user = await this.usersService.findById(payload.sub);
      if (!user.isEmailVerified) {
        await this.usersService.verifyEmail(user.id);
      }

      return this.generateTokens(user.id);
    } catch {
      throw new BadRequestException("Invalid or expired magic link");
    }
  }

  // ─── OAuth ──────────────────────────────────────────

  async oauthLogin(provider: OAuthProvider, code: string, redirectUri: string): Promise<TokenPair> {
    const profile = await this.oauthService.getUserProfile(provider, code, redirectUri);

    // 1. Try to find existing OAuth user
    let user = await this.usersService.findByOAuth(provider, profile.id);
    if (user) {
      return this.generateTokens(user.id);
    }

    // 2. Try to find by email — link OAuth to existing account
    user = await this.usersService.findByEmail(profile.email);
    if (user) {
      await this.usersService.linkOAuth(user.id, provider, profile.id);
      if (!user.isEmailVerified) {
        await this.usersService.verifyEmail(user.id);
      }
      return this.generateTokens(user.id);
    }

    // 3. Create new user
    user = await this.usersService.createOAuthUser({
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      oauthProvider: provider,
      oauthId: profile.id,
    });

    return this.generateTokens(user.id);
  }

  // ─── Private helpers ────────────────────────────────

  private async generateTokens(userId: string): Promise<TokenPair> {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.getJwtSecret(),
        expiresIn: this.configService.get("JWT_ACCESS_EXPIRES_IN") || "15m",
      } as any,
    );

    const refreshTokenValue = randomUUID();
    const refreshTokenHash = await hash(refreshTokenValue);

    const expiresIn = this.configService.get<number>("JWT_REFRESH_DAYS", 7);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresIn);

    await this.refreshTokenModel.create({
      userId,
      tokenHash: refreshTokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  private async sendVerificationEmail(
    userId: string,
    email: string,
  ) {
    const token = this.jwtService.sign(
      { sub: userId, type: "email-verification" },
      { secret: this.getJwtSecret(), expiresIn: "24h" } as any,
    );

    // TODO: Integrate with Nodemailer
    this.mailService.sendEmailVerification(email, token).catch(() => {});
  }

  private getJwtSecret() {
    return this.configService.getOrThrow<string>("JWT_ACCESS_SECRET");
  }
}
