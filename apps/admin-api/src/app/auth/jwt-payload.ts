import { Permission, RoleName } from '@vfair/prisma-client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: RoleName;
  partnerId: number | null;
  permissions: Record<Permission, boolean>;
};
