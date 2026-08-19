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
import {
  DICE_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  KENO_GAME_ID,
} from '../libs/game-contracts/src/games';
import { UNSUPPORTED_GAME_RTP } from '../libs/game-math/src/game-rtp';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleName } from '../generated/prisma/client';
import { seedDevKpi } from './seed-dev-kpi';
import { seedGameVerificationContent } from './seed-game-verification-content';

const NODE_ENV = process.env['NODE_ENV'];

if (NODE_ENV === 'production') {
  console.error('seed-dev must not run in production');
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

const PARTNER_NAME = 'demo-partner';
const PARTNER_CODE = 'demo-partner';
const PARTNER_SECRET = 'dev-demo-partner-secret';
const PARTNER_USER_EMAIL = 'partner@demo-partner.local';
const PARTNER_USER_PASSWORD = 'password';
const DEV_CURRENCIES = ['USD', 'EUR', 'RUB'] as const;
const DEV_PLAYER_EXTERNAL_IDS = [
  'player1',
  'player2',
  'player3',
  'player4',
  'player5',
] as const;

const seedDev = async () => {
  const partnerRole = await prisma.role.findUniqueOrThrow({
    where: { name: RoleName.PARTNER },
  });

  const hashedPassword = await bcrypt.hash(PARTNER_USER_PASSWORD, 10);

  console.log('Wiping existing game data, partner users and partners…');
  await prisma.dailyKpi.deleteMany();
  await prisma.kpiProcessedRound.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.gameRound.deleteMany();
  await prisma.fairnessRotation.deleteMany();
  await prisma.provablyFairSeed.deleteMany();
  await prisma.player.deleteMany();
  await prisma.gameVerificationContent.deleteMany();
  await prisma.partnerGame.deleteMany();
  await prisma.partnerCurrency.deleteMany();
  await prisma.partnerTheme.deleteMany();
  await prisma.user.deleteMany({ where: { role: { name: RoleName.PARTNER } } });
  await prisma.partner.deleteMany();

  console.log(`Seeding partner "${PARTNER_NAME}"…`);

  const partner = await prisma.partner.create({
    data: {
      name: PARTNER_NAME,
      code: PARTNER_CODE,
      secret: PARTNER_SECRET,
      webhookUrl: 'http://localhost:3002/api/wallet',
      currencies: {
        create: [
          {
            code: 'USD',
            minBet: 0.01,
            maxBet: 1000,
            maxWin: 100000,
            decimals: 2,
          },
          {
            code: 'EUR',
            minBet: 0.01,
            maxBet: 1000,
            maxWin: 100000,
            decimals: 2,
          },
          {
            code: 'RUB',
            minBet: 10,
            maxBet: 100000,
            maxWin: 10000000,
            decimals: 2,
          },
        ],
      },
      games: {
        create: [
          {
            gameId: DICE_GAME_ID,
            enabled: true,
            rtp: 0.98,
          },
          {
            gameId: MINES_GAME_ID,
            enabled: true,
            rtp: 0.98,
          },
          {
            gameId: LIMBO_GAME_ID,
            enabled: true,
            rtp: 0.98,
          },
          {
            gameId: PLINKO_GAME_ID,
            enabled: true,
            rtp: UNSUPPORTED_GAME_RTP,
          },
          {
            gameId: KENO_GAME_ID,
            enabled: true,
            rtp: UNSUPPORTED_GAME_RTP,
          },
        ],
      },
      theme: {
        create: {
          lightAccent: '#b23cdd',
          lightGray: '#978b98',
          lightBg: '#FFFFFF',
          darkAccent: '#c23cdd',
          darkGray: '#988b97',
          darkBg: '#111111',
          defaultAppearance: 'dark',
          themeSwitcherEnabled: true,
          lightAccentColor: 'purple',
          darkAccentColor: 'purple',
        },
      },
      users: {
        create: {
          email: PARTNER_USER_EMAIL,
          password: hashedPassword,
          roleId: partnerRole.id,
        },
      },
    },
  });

  await seedGameVerificationContent(prisma, partner.id);

  await prisma.player.createMany({
    data: DEV_PLAYER_EXTERNAL_IDS.map((externalId) => ({
      partnerId: partner.id,
      externalId,
    })),
  });

  const players = await prisma.player.findMany({
    where: { partnerId: partner.id },
    select: { id: true },
    orderBy: { externalId: 'asc' },
  });

  console.log('Seeding sample KPI reports…');
  await seedDevKpi(prisma, {
    partnerId: partner.id,
    playerIds: players.map((player) => player.id),
    currencies: [...DEV_CURRENCIES],
  });

  console.log('Dev seed complete');
  console.log(`  Partner: ${partner.name} (${partner.code})`);
  console.log(
    `  Partner user: ${PARTNER_USER_EMAIL} / ${PARTNER_USER_PASSWORD}`,
  );
  console.log(`  Currencies: ${DEV_CURRENCIES.join(', ')}`);
  console.log(`  Players: ${DEV_PLAYER_EXTERNAL_IDS.join(', ')}`);
  console.log(
    `  Games: ${DICE_GAME_ID}, ${MINES_GAME_ID}, ${LIMBO_GAME_ID}, ${PLINKO_GAME_ID}, ${KENO_GAME_ID} (enabled; plinko/keno rtp=-1, others rtp=0.98)`,
  );
};

seedDev()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
