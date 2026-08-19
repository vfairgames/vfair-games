import { config } from 'dotenv';

for (const path of [
  'apps/fake-partner-api/.env.local',
  'apps/fake-partner-api/.env',
  '.env.local',
  '.env',
]) {
  config({ path });
}

import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma-partner-api/client';

const PLAYERS_COUNT = 100;
const PASSWORD = 'secret';

const PLAYER_WALLETS = [
  { currency: 'USD', balance: '10000.00', decimals: 2 },
  { currency: 'RUB', balance: '900000.00', decimals: 2 },
  { currency: 'EUR', balance: '8000.00', decimals: 2 },
  { currency: 'GBP', balance: '7000.00', decimals: 2 },
  { currency: 'CAD', balance: '12000.00', decimals: 2 },
] as const;

const adapter = new PrismaPg({
  connectionString: process.env['PARTNER_API_DATABASE_URL'],
});
const prisma = new PrismaClient({ adapter });

const seed = async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await prisma.walletTransaction.deleteMany();
  await prisma.playerWallet.deleteMany();
  await prisma.player.deleteMany();

  for (let index = 1; index <= PLAYERS_COUNT; index += 1) {
    await prisma.player.create({
      data: {
        username: `player${index}`,
        password: passwordHash,
        wallets: {
          create: [...PLAYER_WALLETS],
        },
      },
    });
  }

  const currencyCodes = PLAYER_WALLETS.map((wallet) => wallet.currency).join(
    ', ',
  );
  console.log(
    `Seeded ${PLAYERS_COUNT} players with ${PLAYER_WALLETS.length} wallets each (${currencyCodes})`,
  );
};

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
