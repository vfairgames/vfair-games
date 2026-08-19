import { BadRequestException } from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt-payload';
import { assertPartnerScope } from '../players/player-access';

export const resolveDashboardPartnerId = (
  user: JwtPayload,
  queryPartnerId?: number,
): number => {
  if (user.role === 'PARTNER') {
    return assertPartnerScope(user);
  }

  if (queryPartnerId == null) {
    throw new BadRequestException({
      err_code: 'partner_id_required',
      message: 'Partner id is required',
    });
  }

  return queryPartnerId;
};
