import { config } from 'dotenv';

for (const path of [
  'apps/admin-api/.env.local',
  'apps/admin-api/.env',
  '.env.local',
  '.env',
]) {
  config({ path });
}

import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Permission, PrismaClient, RoleName } from '../generated/prisma/client';
import { seedGameVerificationContent } from './seed-game-verification-content';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

const seed = async () => {
  const adminRole = await prisma.role.upsert({
    where: { name: RoleName.ADMIN },
    update: {},
    create: { name: RoleName.ADMIN },
  });

  const partnerRole = await prisma.role.upsert({
    where: { name: RoleName.PARTNER },
    update: {},
    create: { name: RoleName.PARTNER },
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permission: {
        roleId: adminRole.id,
        permission: Permission.MANAGE_USERS,
      },
    },
    update: { granted: true },
    create: {
      roleId: adminRole.id,
      permission: Permission.MANAGE_USERS,
      granted: true,
    },
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permission: {
        roleId: partnerRole.id,
        permission: Permission.MANAGE_USERS,
      },
    },
    update: { granted: false },
    create: {
      roleId: partnerRole.id,
      permission: Permission.MANAGE_USERS,
      granted: false,
    },
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permission: {
        roleId: adminRole.id,
        permission: Permission.MANAGE_PARTNERS,
      },
    },
    update: { granted: true },
    create: {
      roleId: adminRole.id,
      permission: Permission.MANAGE_PARTNERS,
      granted: true,
    },
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permission: {
        roleId: partnerRole.id,
        permission: Permission.MANAGE_PARTNERS,
      },
    },
    update: { granted: false },
    create: {
      roleId: partnerRole.id,
      permission: Permission.MANAGE_PARTNERS,
      granted: false,
    },
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permission: {
        roleId: adminRole.id,
        permission: Permission.MANAGE_PLAYERS,
      },
    },
    update: { granted: true },
    create: {
      roleId: adminRole.id,
      permission: Permission.MANAGE_PLAYERS,
      granted: true,
    },
  });

  await prisma.rolePermission.upsert({
    where: {
      roleId_permission: {
        roleId: partnerRole.id,
        permission: Permission.MANAGE_PLAYERS,
      },
    },
    update: { granted: true },
    create: {
      roleId: partnerRole.id,
      permission: Permission.MANAGE_PLAYERS,
      granted: true,
    },
  });

  const adminPassword = process.env['ADMIN_PASSWORD'] ?? 'secret';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminEmail = 'admin@example.com';
  const existingAdmin = await prisma.user.findFirst({
    where: { email: adminEmail, deletedAt: null },
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        roleId: adminRole.id,
      },
    });
  }

  const partners = await prisma.partner.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  for (const partner of partners) {
    await seedGameVerificationContent(prisma, partner.id);
  }

  console.log('Seed complete');
};

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
