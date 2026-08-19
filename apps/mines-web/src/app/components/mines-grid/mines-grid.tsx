import { MINES_GRID_SIZE } from '@vfair/game-math';
import { useShallow } from 'zustand/react/shallow';

import {
  useIsMinesAutoBetInProgress,
  useIsMinesRevealInProgress,
  usePendingMinesRevealTile,
} from '../../query/use-is-mines-bet-in-progress';
import { useRevealTile } from '../../query/use-place-manual-bet';
import { minesSoundService } from '../../services/mines-sound.service';
import { useMinesGameStore } from '../../store/mines-game-store';
import { MinesTile, type MinesTileVisualState } from '../mines-tile/mines-tile';
import { MinesWinPopover } from '../mines-win-popover/mines-win-popover';

import './mines-grid.scss';

const getTileVisualState = ({
  tile,
  betMode,
  roundStatus,
  revealedTiles,
  selectedTiles,
  mineLayout,
  lastSettledMineLayout,
}: {
  tile: number;
  betMode: 'manual' | 'auto';
  roundStatus: 'idle' | 'active' | 'settled';
  revealedTiles: number[];
  selectedTiles: number[];
  mineLayout: number[];
  lastSettledMineLayout: number[];
}): MinesTileVisualState => {
  if (roundStatus === 'active') {
    if (revealedTiles.includes(tile)) {
      return mineLayout.includes(tile) ? 'mine' : 'gem';
    }

    return 'unrevealed';
  }

  if (roundStatus === 'settled') {
    return lastSettledMineLayout.includes(tile) ? 'mine' : 'gem';
  }

  if (betMode === 'auto' && selectedTiles.includes(tile)) {
    return 'selected';
  }

  return 'idle';
};

export const MinesGrid = () => {
  const {
    form,
    roundStatus,
    activeRound,
    selectedTiles,
    lastSettled,
    lastWin,
    instant,
    toggleSelectedTile,
  } = useMinesGameStore(
    useShallow((state) => ({
      form: state.form,
      roundStatus: state.roundStatus,
      activeRound: state.activeRound,
      selectedTiles: state.selectedTiles,
      lastSettled: state.lastSettled,
      lastWin: state.lastWin,
      instant: state.betResultTransitionMs === 0,
      toggleSelectedTile: state.toggleSelectedTile,
    })),
  );
  const { mutate: revealTile } = useRevealTile();
  const isAutoBetInProgress = useIsMinesAutoBetInProgress();
  const isRevealInProgress = useIsMinesRevealInProgress();
  const revealingTile = usePendingMinesRevealTile();
  const revealedTiles = activeRound?.reveals.map((entry) => entry.tile) ?? [];
  const mineLayout = activeRound?.mineLayout ?? [];
  const lastSettledMineLayout = lastSettled?.mineLayout ?? [];
  const playerRevealedTiles = lastSettled?.playerRevealedTiles ?? [];

  return (
    <div className="mines-grid-stage">
      <div className="mines-grid">
        {Array.from({ length: MINES_GRID_SIZE }, (_, tile) => {
          const visualState = getTileVisualState({
            tile,
            betMode: form.betMode,
            roundStatus,
            revealedTiles,
            selectedTiles,
            mineLayout,
            lastSettledMineLayout,
          });
          const canSelect =
            form.betMode === 'auto' &&
            roundStatus !== 'active' &&
            !isAutoBetInProgress;
          const canReveal =
            form.betMode === 'manual' &&
            roundStatus === 'active' &&
            !revealedTiles.includes(tile) &&
            !isRevealInProgress;
          const isRevealed = visualState === 'gem' || visualState === 'mine';

          return (
            <MinesTile
              key={tile}
              visualState={visualState}
              isDimmed={
                roundStatus === 'settled' &&
                isRevealed &&
                !playerRevealedTiles.includes(tile)
              }
              isRevealing={isRevealInProgress && revealingTile === tile}
              disabled={!canSelect && !canReveal}
              instant={instant}
              onClick={() => {
                if (canSelect) {
                  minesSoundService.playAction();
                  toggleSelectedTile(tile);
                  return;
                }

                if (canReveal) {
                  minesSoundService.playAction();
                  revealTile(tile);
                }
              }}
            />
          );
        })}
      </div>
      {lastWin ? <MinesWinPopover win={lastWin} /> : null}
    </div>
  );
};
