import type { Prisma } from '@vfair/prisma-client';
import { RoundStatus, SeedStatus } from '@vfair/prisma-client';
import type { Currency } from '@vfair/app-common';
import type {
  BetResult,
  DiceGameData,
  FairnessSnapshot,
  LimboGameData,
  MinesGameData,
  MinesRevealEntry,
  PlinkoGameData,
  KenoGameData,
} from '@vfair/game-contracts';
import {
  DICE_GAME_ID,
  DICE_GAME_MODES,
  isAvailableGameId,
  KENO_GAME_ID,
  KENO_RISKS,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
  PLINKO_RISKS,
} from '@vfair/game-contracts';
import type { RoundForDetail } from './round.types';

export class InvalidRoundOutcomeError extends Error {
  constructor(message = 'Invalid round outcome') {
    super(message);
    this.name = 'InvalidRoundOutcomeError';
  }
}

export class InternalRoundMappingError extends Error {
  constructor() {
    super('Internal round status cannot be mapped');
    this.name = 'InternalRoundMappingError';
  }
}

export const mapRoundStatus = (status: RoundStatus): BetResult['status'] => {
  switch (status) {
    case RoundStatus.FAILED:
      throw new InternalRoundMappingError();
    case RoundStatus.WON:
      return 'won';
    case RoundStatus.LOST:
      return 'lost';
    case RoundStatus.ACTIVE:
      return 'active';
  }
};

export const buildFairnessSnapshot = (
  rotation: RoundForDetail['rotation'],
  nonce: number,
): FairnessSnapshot => ({
  serverSeedHash: rotation.serverSeed.serverSeedHash,
  clientSeed: rotation.clientSeed,
  nonce,
  serverSeed:
    rotation.serverSeed.status === SeedStatus.REVEALED
      ? rotation.serverSeed.serverSeed
      : null,
});

const parseFiniteNumber = (value: unknown): number => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new InvalidRoundOutcomeError();
  }

  return parsed;
};

const parseDiceGameMode = (value: unknown): DiceGameData['gameMode'] => {
  if (
    typeof value !== 'string' ||
    !(DICE_GAME_MODES as readonly string[]).includes(value)
  ) {
    throw new InvalidRoundOutcomeError();
  }

  return value as DiceGameData['gameMode'];
};

const asOutcomeRecord = (
  outcome: Prisma.JsonValue,
): Record<string, unknown> => {
  if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) {
    throw new InvalidRoundOutcomeError();
  }

  return outcome as Record<string, unknown>;
};

const parseDiceGameData = (outcome: Prisma.JsonValue): DiceGameData => {
  const value = asOutcomeRecord(outcome);

  return {
    rolledValue: parseFiniteNumber(value.rolledValue),
    sliderValue: parseFiniteNumber(value.sliderValue),
    gameMode: parseDiceGameMode(value.gameMode),
    multiplier: parseFiniteNumber(value.multiplier),
    winChance: parseFiniteNumber(value.winChance),
  };
};

const parseLimboGameData = (outcome: Prisma.JsonValue): LimboGameData => {
  const value = asOutcomeRecord(outcome);

  return {
    rolledMultiplier: parseFiniteNumber(value.rolledMultiplier),
    targetMultiplier: parseFiniteNumber(value.targetMultiplier),
    winChance: parseFiniteNumber(value.winChance),
    multiplier: parseFiniteNumber(value.multiplier),
  };
};

const parseMineLayout = (value: unknown): number[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new InvalidRoundOutcomeError();
  }

  return value.map((tile) => {
    if (!Number.isInteger(tile)) {
      throw new InvalidRoundOutcomeError();
    }

    return tile;
  });
};

const parseMinesReveals = (value: unknown): MinesRevealEntry[] => {
  if (!Array.isArray(value)) {
    throw new InvalidRoundOutcomeError();
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new InvalidRoundOutcomeError();
    }

    const record = entry as Record<string, unknown>;

    if (!Number.isInteger(record.tile) || !Number.isInteger(record.order)) {
      throw new InvalidRoundOutcomeError();
    }

    return {
      tile: record.tile as number,
      order: record.order as number,
      multiplier: parseFiniteNumber(record.multiplier),
    };
  });
};

const parseMinesGameData = (
  outcome: Prisma.JsonValue,
  status: RoundStatus,
): MinesGameData => {
  const value = asOutcomeRecord(outcome);
  const mineLayout = parseMineLayout(value.mineLayout);
  const gameData: MinesGameData = {
    mineCount: parseFiniteNumber(value.mineCount),
    gridSize: parseFiniteNumber(value.gridSize),
    reveals: parseMinesReveals(value.reveals),
    multiplier: parseFiniteNumber(value.multiplier),
  };

  if (status !== RoundStatus.ACTIVE && mineLayout !== undefined) {
    gameData.mineLayout = mineLayout;
  }

  return gameData;
};

const parsePlinkoRisk = (value: unknown): PlinkoGameData['risk'] => {
  if (
    typeof value !== 'string' ||
    !(PLINKO_RISKS as readonly string[]).includes(value)
  ) {
    throw new InvalidRoundOutcomeError();
  }

  return value as PlinkoGameData['risk'];
};

const parseKenoRisk = (value: unknown): KenoGameData['risk'] => {
  if (
    typeof value !== 'string' ||
    !(KENO_RISKS as readonly string[]).includes(value)
  ) {
    throw new InvalidRoundOutcomeError();
  }

  return value as KenoGameData['risk'];
};

const parseKenoPicks = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    throw new InvalidRoundOutcomeError();
  }

  return value.map((pick) => parseFiniteNumber(pick));
};

const parseKenoDrawnNumbers = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    throw new InvalidRoundOutcomeError();
  }

  return value.map((drawn) => parseFiniteNumber(drawn));
};

const parseKenoGameData = (outcome: Prisma.JsonValue): KenoGameData => {
  const value = asOutcomeRecord(outcome);

  return {
    picks: parseKenoPicks(value.picks),
    risk: parseKenoRisk(value.risk),
    drawnNumbers: parseKenoDrawnNumbers(value.drawnNumbers),
    hitCount: parseFiniteNumber(value.hitCount),
    multiplier: parseFiniteNumber(value.multiplier),
  };
};

const parsePlinkoPath = (value: unknown): boolean[] => {
  if (!Array.isArray(value)) {
    throw new InvalidRoundOutcomeError();
  }

  return value.map((step) => {
    if (typeof step !== 'boolean') {
      throw new InvalidRoundOutcomeError();
    }

    return step;
  });
};

const parsePlinkoGameData = (outcome: Prisma.JsonValue): PlinkoGameData => {
  const value = asOutcomeRecord(outcome);

  return {
    rows: parseFiniteNumber(value.rows),
    risk: parsePlinkoRisk(value.risk),
    path: parsePlinkoPath(value.path),
    bucketIndex: parseFiniteNumber(value.bucketIndex),
    multiplier: parseFiniteNumber(value.multiplier),
  };
};

const buildBetResultBase = (
  round: RoundForDetail,
  status: BetResult['status'],
) => {
  const winAmount = round.winAmount?.toNumber() ?? 0;

  return {
    id: round.id.toString(),
    status,
    betAmount: round.betAmount.toNumber(),
    cashOut: winAmount,
    balance: round.balanceAfter?.toNumber() ?? 0,
    currency: {
      code: round.currency as Currency,
      decimals: round.partnerCurrency.decimals,
    },
    createdAt: round.createdAt.getTime(),
    fairness: buildFairnessSnapshot(round.rotation, round.nonce),
  };
};

const asPartialGameData = (
  outcome: Prisma.JsonValue,
): Record<string, unknown> => {
  if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) {
    return {};
  }

  return outcome as Record<string, unknown>;
};

const isFailedLikeRoundStatus = (status: RoundStatus): boolean =>
  status === RoundStatus.FAILED;

export const mapFailedRoundFallback = (round: RoundForDetail): BetResult => {
  if (!isFailedLikeRoundStatus(round.status)) {
    throw new InvalidRoundOutcomeError(
      'Failed fallback requires FAILED status',
    );
  }

  if (!isAvailableGameId(round.gameId)) {
    throw new InvalidRoundOutcomeError(`Unsupported game id "${round.gameId}"`);
  }

  return {
    ...buildBetResultBase(round, 'failed'),
    gameId: round.gameId,
    gameData: asPartialGameData(round.outcome),
  } as BetResult;
};

export const mapGameRoundToBetResult = (round: RoundForDetail): BetResult => {
  const base = buildBetResultBase(round, mapRoundStatus(round.status));

  if (round.gameId === DICE_GAME_ID) {
    return {
      ...base,
      gameId: DICE_GAME_ID,
      gameData: parseDiceGameData(round.outcome),
    };
  }

  if (round.gameId === LIMBO_GAME_ID) {
    return {
      ...base,
      gameId: LIMBO_GAME_ID,
      gameData: parseLimboGameData(round.outcome),
    };
  }

  if (round.gameId === MINES_GAME_ID) {
    return {
      ...base,
      gameId: MINES_GAME_ID,
      gameData: parseMinesGameData(round.outcome, round.status),
    };
  }

  if (round.gameId === PLINKO_GAME_ID) {
    return {
      ...base,
      gameId: PLINKO_GAME_ID,
      gameData: parsePlinkoGameData(round.outcome),
    };
  }

  if (round.gameId === KENO_GAME_ID) {
    return {
      ...base,
      gameId: KENO_GAME_ID,
      gameData: parseKenoGameData(round.outcome),
    };
  }

  throw new InvalidRoundOutcomeError(`Unsupported game id "${round.gameId}"`);
};
