import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model } from "mongoose";

import type { UpdateProfileDto } from "./dto/update-profile.dto";
import { type OAuthProvider, UserEntity } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(@InjectModel(UserEntity.name) private userModel: Model<UserEntity>) {}

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<UserEntity> {
    return this.userModel.create({
      ...data,
      email: data.email.toLowerCase(),
    });
  }

  async updateProfile(userId: string, input: UpdateProfileDto): Promise<UserEntity> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: input }, { new: true })
      .exec();
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async setPassword(userId: string, passwordHash: string) {
    await this.userModel.findByIdAndUpdate(userId, { passwordHash }).exec();
  }

  async verifyEmail(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, { isEmailVerified: true }).exec();
  }

  async setTwoFactorSecret(userId: string, secret: string) {
    await this.userModel.findByIdAndUpdate(userId, { twoFactorSecret: secret }).exec();
  }

  async enableTwoFactor(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, { isTwoFactorEnabled: true }).exec();
  }

  async disableTwoFactor(userId: string) {
    await this.userModel
      .findByIdAndUpdate(userId, {
        isTwoFactorEnabled: false,
        $unset: { twoFactorSecret: 1 },
      })
      .exec();
  }

  async findByOAuth(provider: OAuthProvider, oauthId: string): Promise<UserEntity | null> {
    return this.userModel.findOne({ oauthProvider: provider, oauthId }).exec();
  }

  async createOAuthUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    oauthProvider: OAuthProvider;
    oauthId: string;
  }): Promise<UserEntity> {
    return this.userModel.create({
      ...data,
      email: data.email.toLowerCase(),
      isEmailVerified: true,
    });
  }

  async linkOAuth(userId: string, provider: OAuthProvider, oauthId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      oauthProvider: provider,
      oauthId,
    }).exec();
  }
}
