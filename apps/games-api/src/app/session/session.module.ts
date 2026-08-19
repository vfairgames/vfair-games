import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SessionTokenInvalidationService } from './session-token-invalidation.service';
import { SessionTokenService } from './session-token.service';
import { SocketSessionGuard } from './socket-session.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    SessionTokenService,
    SessionTokenInvalidationService,
    SocketSessionGuard,
  ],
  exports: [
    SessionTokenService,
    SessionTokenInvalidationService,
    SocketSessionGuard,
  ],
})
export class SessionModule {}
