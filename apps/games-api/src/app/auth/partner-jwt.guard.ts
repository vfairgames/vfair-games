import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { extractClientIp } from './extract-client-ip';
import { isIpAllowed } from './is-ip-allowed';
import type { AuthenticatedPartner } from './partner-jwt-payload';

@Injectable()
export class PartnerJwtGuard extends AuthGuard('partner-jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = await super.canActivate(context);
    if (!activated) {
      return false;
    }

    const request = context.switchToHttp().getRequest<{
      user: AuthenticatedPartner;
      ip?: string;
      headers: Record<string, string | string[] | undefined>;
      socket: { remoteAddress?: string };
    }>();

    const partner = request.user;
    const clientIp = extractClientIp(request);

    if (!isIpAllowed(clientIp, partner.ipWhitelist || '*')) {
      throw new ForbiddenException({
        err_code: 'ip_not_allowed',
        message: 'IP not allowed',
      });
    }

    return true;
  }
}
