import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '@vfair/prisma-client';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import type { JwtPayload } from './jwt-payload';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const { user } = request;

    if (!user?.permissions) {
      throw new ForbiddenException({
        err_code: 'insufficient_permissions',
        message: 'Insufficient permissions',
      });
    }

    const hasAll = required.every((perm) => user.permissions[perm] === true);

    if (!hasAll) {
      throw new ForbiddenException({
        err_code: 'insufficient_permissions',
        message: 'Insufficient permissions',
      });
    }

    return true;
  }
}
