import { config } from 'dotenv';

for (const path of [
  'apps/admin-api/.env.local',
  'apps/admin-api/.env',
  '.env.local',
  '.env',
]) {
  config({ path });
}

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const parsePositiveInteger = (name: string, defaultValue: number): number => {
  const raw = process.env[name];

  if (!raw) {
    return defaultValue;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
};

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

const maintainArchiveRetention = async () => {
  const liveRetainMonths = parsePositiveInteger('LIVE_RETAIN_MONTHS', 12);
  const archiveRetainMonths = parsePositiveInteger('ARCHIVE_RETAIN_MONTHS', 36);
  const archiveBatchSize = parsePositiveInteger('ARCHIVE_BATCH_SIZE', 10000);
  const partitionMonthsAhead = parsePositiveInteger(
    'PARTITION_MONTHS_AHEAD',
    1,
  );
  const totalRetainMonths = liveRetainMonths + archiveRetainMonths;
  const partitionMonthsBack = parsePositiveInteger(
    'PARTITION_MONTHS_BACK',
    totalRetainMonths,
  );

  const lock = await prisma.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(hashtext('maintenance.archive_retention')) AS locked
  `;

  if (!lock[0]?.locked) {
    throw new Error('Archive retention maintenance is already running');
  }

  let archived: {
    archived_wallet_transactions: bigint;
    archived_game_rounds: bigint;
  }[];
  let droppedPartitions: { dropped_table: string }[];

  try {
    await prisma.$executeRaw`
      SELECT "maintenance"."ensure_archive_partitions"(${partitionMonthsBack}, ${partitionMonthsAhead})
    `;

    archived = await prisma.$queryRaw<
      {
        archived_wallet_transactions: bigint;
        archived_game_rounds: bigint;
      }[]
    >`
      SELECT archived_wallet_transactions, archived_game_rounds
      FROM "maintenance"."archive_fast_growth_data"(${liveRetainMonths}, ${archiveBatchSize})
    `;

    droppedPartitions = await prisma.$queryRaw<{ dropped_table: string }[]>`
      SELECT dropped_table
      FROM "maintenance"."drop_old_archive_partitions"(${totalRetainMonths})
    `;
  } finally {
    await prisma.$executeRaw`
      SELECT pg_advisory_unlock(hashtext('maintenance.archive_retention'))
    `;
  }

  const archivedRow = archived[0] ?? {
    archived_wallet_transactions: BigInt(0),
    archived_game_rounds: BigInt(0),
  };

  console.log(`Live retention window: ${liveRetainMonths} month(s)`);
  console.log(`Archive retention window: ${archiveRetainMonths} month(s)`);
  console.log(`Total retention window: ${totalRetainMonths} month(s)`);
  console.log(`Archive partition months back: ${partitionMonthsBack}`);
  console.log(`Archive batch size: ${archiveBatchSize}`);
  console.log(
    `Archived wallet transactions: ${archivedRow.archived_wallet_transactions.toString()}`,
  );
  console.log(
    `Archived game rounds: ${archivedRow.archived_game_rounds.toString()}`,
  );

  if (droppedPartitions.length === 0) {
    console.log('No archive partitions dropped');
    return;
  }

  console.log('Dropped archive partitions:');
  for (const partition of droppedPartitions) {
    console.log(`  ${partition.dropped_table}`);
  }
};

maintainArchiveRetention()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
