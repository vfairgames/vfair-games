import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class PartnerJwtGuard extends AuthGuard('partner-jwt') {}
