import type { SeedStatus } from '@vfair/prisma-client';

export type LockedOpenRotation = {
  id: number;
  clientSeed: string;
  nonceCount: number;
  sequence: number;
  serverSeedId: number;
  serverSeed: {
    id: number;
    serverSeed: string;
    serverSeedHash: string;
    status: SeedStatus;
  };
};

export type LockedOpenRotationRow = {
  id: number;
  clientSeed: string;
  nonceCount: number;
  sequence: number;
  serverSeedId: number;
  seedId: number;
  serverSeed: string;
  serverSeedHash: string;
  seedStatus: SeedStatus;
};

export const mapLockedOpenRotationRow = (
  row: LockedOpenRotationRow,
): LockedOpenRotation => ({
  id: row.id,
  clientSeed: row.clientSeed,
  nonceCount: row.nonceCount,
  sequence: row.sequence,
  serverSeedId: row.serverSeedId,
  serverSeed: {
    id: row.seedId,
    serverSeed: row.serverSeed,
    serverSeedHash: row.serverSeedHash,
    status: row.seedStatus,
  },
});
