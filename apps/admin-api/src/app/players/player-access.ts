import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt-payload';

export const assertPartnerScope = (user: JwtPayload): number => {
  if (user.partnerId == null) {
    throw new ForbiddenException({
      err_code: 'partner_scope_required',
      message: 'Partner scope is required',
    });
  }

  return user.partnerId;
};

export const resolveListPartnerId = (
  user: JwtPayload,
  queryPartnerId?: number,
): number | undefined => {
  if (user.role === 'PARTNER') {
    return assertPartnerScope(user);
  }

  return queryPartnerId;
};

export const assertPlayerBelongsToUser = (
  user: JwtPayload,
  playerPartnerId: number,
): void => {
  if (user.role !== 'PARTNER') {
    return;
  }

  const scopedPartnerId = assertPartnerScope(user);

  if (playerPartnerId !== scopedPartnerId) {
    throw new NotFoundException({
      err_code: 'player_not_found',
      message: 'Player not found',
    });
  }
};
