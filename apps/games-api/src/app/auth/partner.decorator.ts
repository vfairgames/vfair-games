import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedPartner } from './partner-jwt-payload';

export const Partner = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPartner => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedPartner }>();
    return request.user;
  },
);
