import type { DiceGameMode, KenoRisk, PlinkoRisk } from './games';
import {
  DICE_GAME_ID,
  KENO_GAME_ID,
  LIMBO_GAME_ID,
  MINES_GAME_ID,
  PLINKO_GAME_ID,
} from './games';

export type DiceBetInput = {
  sliderValue: number;
  gameMode: DiceGameMode;
  multiplier: number;
  winChance: number;
};

export type DiceGameData = DiceBetInput & {
  rolledValue: number;
};

export type LimboBetInput = {
  targetMultiplier: number;
  winChance: number;
};

export type LimboGameData = LimboBetInput & {
  rolledMultiplier: number;
  multiplier: number;
};

export type MinesBetInput = {
  mineCount: number;
  gridSize: number;
};

export type MinesRevealEntry = {
  tile: number;
  order: number;
  multiplier: number;
};

export type MinesGameData = MinesBetInput & {
  mineLayout?: number[];
  reveals: MinesRevealEntry[];
  multiplier: number;
};

export type PlinkoBetInput = {
  rows: number;
  risk: PlinkoRisk;
};

export type PlinkoGameData = PlinkoBetInput & {
  path: boolean[];
  bucketIndex: number;
  multiplier: number;
};

export type KenoBetInput = {
  picks: number[];
  risk: KenoRisk;
};

export type KenoGameData = KenoBetInput & {
  drawnNumbers: number[];
  hitCount: number;
  multiplier: number;
};

export type GameDataByGameId = {
  [DICE_GAME_ID]: DiceGameData;
  [LIMBO_GAME_ID]: LimboGameData;
  [MINES_GAME_ID]: MinesGameData;
  [PLINKO_GAME_ID]: PlinkoGameData;
  [KENO_GAME_ID]: KenoGameData;
};

export type PlaceBetGameDataByGameId = {
  [DICE_GAME_ID]: DiceBetInput;
  [LIMBO_GAME_ID]: LimboBetInput;
  [MINES_GAME_ID]: MinesBetInput;
  [PLINKO_GAME_ID]: PlinkoBetInput;
  [KENO_GAME_ID]: KenoBetInput;
};
