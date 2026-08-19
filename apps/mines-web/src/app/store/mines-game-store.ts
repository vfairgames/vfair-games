import {
  createMinesOdds,
  DEFAULT_GAME_RTP,
  MINES_GRID_SIZE,
  type MinesOdds,
} from '@vfair/game-math';
import type { FairnessSnapshot, MinesRevealEntry } from '@vfair/game-contracts';
import { create } from 'zustand';

import { selectFormLimits, useMainStore } from '@vfair/games-web-shell';

import { applyFormPatch, initialMinesForm, type MinesForm } from './mines-form';

type MinesRoundStatus = 'idle' | 'active' | 'settled';

export type MinesActiveRound = {
  id: string;
  betAmount: number;
  mineCount: number;
  mineLayout: number[];
  reveals: MinesRevealEntry[];
  createdAt: number;
  fairness: FairnessSnapshot;
};

export type MinesLastWin = {
  multiplier: number;
  payout: number;
};

type MinesSettledBoard = {
  mineLayout: number[];
  playerRevealedTiles: number[];
};

type ClearBoardOptions = {
  keepSelection?: boolean;
  keepLastWin?: boolean;
};

type MinesGameStore = {
  minesOdds: MinesOdds;
  form: MinesForm;
  errors: Partial<Record<keyof MinesForm, string>>;
  roundStatus: MinesRoundStatus;
  activeRound: MinesActiveRound | null;
  selectedTiles: number[];
  lastSettled: MinesSettledBoard | null;
  lastWin: MinesLastWin | null;
  betResultTransitionMs: number;
  initMinesOdds: (rtp: number) => void;
  patchForm: (patch: Partial<MinesForm>) => void;
  toggleSelectedTile: (tile: number) => void;
  clearBoard: (options?: ClearBoardOptions) => void;
  setActiveRound: (round: MinesActiveRound) => void;
  updateActiveReveals: (reveals: MinesRevealEntry[]) => void;
  settleRound: (mineLayout: number[], playerRevealedTiles: number[]) => void;
  setLastWin: (lastWin: MinesLastWin | null) => void;
  toggleInstantBet: () => void;
};

const emptyErrors: MinesGameStore['errors'] = {};
const DEFAULT_BET_RESULT_TRANSITION_MS = 300;

export const useMinesGameStore = create<MinesGameStore>((set, get) => {
  const initialMinesOdds = createMinesOdds(DEFAULT_GAME_RTP);

  return {
    minesOdds: initialMinesOdds,
    form: initialMinesForm(initialMinesOdds),
    errors: emptyErrors,
    roundStatus: 'idle',
    activeRound: null,
    selectedTiles: [],
    lastSettled: null,
    lastWin: null,
    betResultTransitionMs: DEFAULT_BET_RESULT_TRANSITION_MS,
    initMinesOdds: (rtp) => {
      if (get().roundStatus === 'active') {
        return;
      }

      const minesOdds = createMinesOdds(rtp);
      const betAmount = useMainStore.getState().calculateInitialBetAmount();

      set({
        minesOdds,
        form: {
          ...initialMinesForm(minesOdds),
          betAmount,
        },
        errors: emptyErrors,
        selectedTiles: [],
        roundStatus: 'idle',
        activeRound: null,
        lastSettled: null,
        lastWin: null,
      });
    },
    toggleInstantBet: () => {
      set({
        betResultTransitionMs:
          get().betResultTransitionMs === 0
            ? DEFAULT_BET_RESULT_TRANSITION_MS
            : 0,
      });
    },
    patchForm: (patch) => {
      const { minesOdds, form, selectedTiles, roundStatus } = get();

      if (roundStatus === 'active') {
        return;
      }

      const result = applyFormPatch(
        form,
        patch,
        selectFormLimits(useMainStore.getState()),
        minesOdds,
      );
      const nextSelectedTiles =
        patch.mineCount === undefined
          ? selectedTiles
          : selectedTiles.slice(
              0,
              minesOdds.getGemCount(result.form.mineCount),
            );

      set({
        form: result.form,
        errors: result.isValid ? emptyErrors : result.errors,
        selectedTiles: nextSelectedTiles,
      });
    },
    toggleSelectedTile: (tile) => {
      const { form, minesOdds, selectedTiles, roundStatus } = get();

      if (roundStatus === 'active' || form.betMode !== 'auto') {
        return;
      }

      if (tile < 0 || tile >= MINES_GRID_SIZE) {
        return;
      }

      if (roundStatus === 'settled') {
        set({
          roundStatus: 'idle',
          lastSettled: null,
          lastWin: null,
        });
      }

      const currentSelected = roundStatus === 'settled' ? [] : selectedTiles;

      if (currentSelected.includes(tile)) {
        set({
          selectedTiles: currentSelected.filter((value) => value !== tile),
        });
        return;
      }

      if (currentSelected.length >= minesOdds.getGemCount(form.mineCount)) {
        return;
      }

      set({
        selectedTiles: [...currentSelected, tile].sort((a, b) => a - b),
      });
    },
    clearBoard: (options = {}) => {
      set({
        roundStatus: 'idle',
        activeRound: null,
        lastSettled: null,
        ...(options.keepSelection ? {} : { selectedTiles: [] }),
        ...(options.keepLastWin ? {} : { lastWin: null }),
      });
    },
    setActiveRound: (round) => {
      set({
        activeRound: round,
        roundStatus: 'active',
        lastSettled: null,
        lastWin: null,
      });
    },
    updateActiveReveals: (reveals) => {
      const { activeRound } = get();

      if (!activeRound) {
        return;
      }

      set({
        activeRound: {
          ...activeRound,
          reveals,
        },
      });
    },
    settleRound: (mineLayout, playerRevealedTiles) => {
      set({
        roundStatus: 'settled',
        activeRound: null,
        lastSettled: { mineLayout, playerRevealedTiles },
      });
    },
    setLastWin: (lastWin) => {
      set({ lastWin });
    },
  };
});
