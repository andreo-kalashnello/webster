import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { OAuthProvider } from "../../modules/users/entities/user.entity";

export interface OAuthUserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(private readonly config: ConfigService) {}

  async getUserProfile(provider: OAuthProvider, code: string, redirectUri: string): Promise<OAuthUserProfile> {
    switch (provider) {
      case OAuthProvider.Google:
        return this.getGoogleProfile(code, redirectUri);
      case OAuthProvider.Facebook:
        return this.getFacebookProfile(code, redirectUri);
      case OAuthProvider.Github:
        return this.getGithubProfile(code, redirectUri);
      default:
        throw new BadRequestException(`Unsupported OAuth provider: ${provider}`);
    }
  }

  // ─── Google ─────────────────────────────────────────

  private async getGoogleProfile(code: string, redirectUri: string): Promise<OAuthUserProfile> {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new BadRequestException("Google OAuth is not configured");
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await this.parseTokenResponse(tokenRes, "Google");

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = (await userRes.json()) as {
      id: string;
      email: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
    };

    return {
      id: user.id,
      email: user.email,
      firstName: user.given_name ?? "User",
      lastName: user.family_name ?? "",
      avatarUrl: user.picture,
    };
  }

  // ─── Facebook ───────────────────────────────────────

  private async getFacebookProfile(code: string, redirectUri: string): Promise<OAuthUserProfile> {
    const clientId = this.config.get<string>("FACEBOOK_CLIENT_ID");
    const clientSecret = this.config.get<string>("FACEBOOK_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new BadRequestException("Facebook OAuth is not configured");
    }

    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      })}`,
    );

    const tokenData = await this.parseTokenResponse(tokenRes, "Facebook");

    const userRes = await fetch(
      `https://graph.facebook.com/me?fields=id,email,first_name,last_name,picture.type(large)&access_token=${tokenData.access_token}`,
    );
    const user = (await userRes.json()) as {
      id: string;
      email: string;
      first_name?: string;
      last_name?: string;
      picture?: { data?: { url?: string } };
    };

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name ?? "User",
      lastName: user.last_name ?? "",
      avatarUrl: user.picture?.data?.url,
    };
  }

  // ─── GitHub ─────────────────────────────────────────

  private async getGithubProfile(code: string, redirectUri: string): Promise<OAuthUserProfile> {
    const clientId = this.config.get<string>("GITHUB_CLIENT_ID");
    const clientSecret = this.config.get<string>("GITHUB_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      throw new BadRequestException("GitHub OAuth is not configured");
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await this.parseTokenResponse(tokenRes, "GitHub");

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
      },
    });
    const user = (await userRes.json()) as {
      id: number;
      email: string | null;
      name?: string;
      login: string;
      avatar_url?: string;
    };

    // GitHub email can be private — fetch from emails endpoint
    let email = user.email;
    if (!email) {
      email = await this.getGithubPrimaryEmail(tokenData.access_token);
    }
    if (!email) {
      throw new BadRequestException("Could not retrieve email from GitHub. Make sure email access is granted.");
    }

    const [firstName, ...rest] = (user.name ?? user.login).split(" ");

    return {
      id: String(user.id),
      email,
      firstName: firstName ?? user.login,
      lastName: rest.join(" ") || "",
      avatarUrl: user.avatar_url,
    };
  }

  private async getGithubPrimaryEmail(accessToken: string): Promise<string | null> {
    const res = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    const emails = (await res.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
    const primary = emails.find((e) => e.primary && e.verified);
    return primary?.email ?? emails.find((e) => e.verified)?.email ?? null;
  }

  // ─── Helpers ────────────────────────────────────────

  private async parseTokenResponse(res: globalThis.Response, provider: string): Promise<TokenResponse> {
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`${provider} token exchange failed: ${body}`);
      throw new BadRequestException(`${provider} authentication failed`);
    }
    const data = (await res.json()) as TokenResponse;
    if (!data.access_token) {
      throw new BadRequestException(`${provider} did not return an access token`);
    }
    return data;
  }
}
