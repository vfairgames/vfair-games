import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PartnerJwtGuard } from './partner-jwt.guard';
import { PartnerJwtStrategy } from './partner-jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  providers: [PartnerJwtStrategy, PartnerJwtGuard],
  exports: [PartnerJwtGuard],
})
export class PartnerAuthModule {}
