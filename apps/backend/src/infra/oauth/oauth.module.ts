import { Global, Module } from "@nestjs/common";

import { OAuthService } from "./oauth.service";

@Global()
@Module({
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}
