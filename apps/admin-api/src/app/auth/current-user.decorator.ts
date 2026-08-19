import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from './jwt-payload';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
