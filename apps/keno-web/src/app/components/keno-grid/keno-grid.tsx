import { KENO_POOL_SIZE, MAX_KENO_PICKS } from '@vfair/game-math';
import { useShallow } from 'zustand/react/shallow';

import { useIsKenoBetInProgress } from '../../query/use-is-keno-bet-in-progress';
import { kenoSoundService } from '../../services/keno-sound.service';
import { useKenoGameStore } from '../../store/keno-game-store';
import { KenoTile, type KenoTileVisualState } from '../keno-tile/keno-tile';
import { KenoWinPopover } from '../keno-win-popover/keno-win-popover';

import './keno-grid.scss';

const getTileVisualState = ({
  number,
  roundStatus,
  selectedPicks,
  revealedNumbers,
  drawnNumbers,
}: {
  number: number;
  roundStatus: 'idle' | 'revealing' | 'settled';
  selectedPicks: number[];
  revealedNumbers: number[];
  drawnNumbers: number[];
}): KenoTileVisualState => {
  const isSelected = selectedPicks.includes(number);
  const isDrawn = drawnNumbers.includes(number);
  const isRevealed = revealedNumbers.includes(number);
  const isRoundActive = roundStatus !== 'idle';

  if (!isRoundActive) {
    return isSelected ? 'selected' : 'idle';
  }

  if (isSelected && isDrawn && (isRevealed || roundStatus === 'settled')) {
    return 'hit';
  }

  if (isSelected) {
    return 'selected';
  }

  if (isDrawn && (isRevealed || roundStatus === 'settled')) {
    return 'unselected';
  }

  return 'idle';
};

export const KenoGrid = () => {
  const {
    roundStatus,
    selectedPicks,
    revealedNumbers,
    lastResult,
    lastWin,
    betResultTransitionMs,
    togglePick,
  } = useKenoGameStore(
    useShallow((state) => ({
      roundStatus: state.roundStatus,
      selectedPicks: state.selectedPicks,
      revealedNumbers: state.revealedNumbers,
      lastResult: state.lastResult,
      lastWin: state.lastWin,
      betResultTransitionMs: state.betResultTransitionMs,
      togglePick: state.togglePick,
    })),
  );
  const isBetInProgress = useIsKenoBetInProgress();
  const drawnNumbers = lastResult?.gameData.drawnNumbers ?? [];
  const instant = betResultTransitionMs === 0;
  const canSelect = roundStatus !== 'revealing' && !isBetInProgress;
  const isMaxPicksReached = selectedPicks.length >= MAX_KENO_PICKS;

  return (
    <div className="keno-grid-stage">
      <div className="keno-grid">
        {Array.from({ length: KENO_POOL_SIZE }, (_, index) => {
          const number = index + 1;
          const isSelected = selectedPicks.includes(number);
          const isSelectionLocked =
            canSelect && isMaxPicksReached && !isSelected;
          const visualState = getTileVisualState({
            number,
            roundStatus,
            selectedPicks,
            revealedNumbers,
            drawnNumbers,
          });
          return (
            <KenoTile
              key={number}
              number={number}
              visualState={visualState}
              isRevealing={
                roundStatus === 'revealing' &&
                drawnNumbers.includes(number) &&
                !revealedNumbers.includes(number) &&
                drawnNumbers.indexOf(number) === revealedNumbers.length
              }
              disabled={!canSelect || isSelectionLocked}
              selectionLocked={isSelectionLocked}
              instant={instant}
              onClick={() => {
                if (!canSelect || isSelectionLocked) {
                  return;
                }

                kenoSoundService.playAction();
                togglePick(number);
              }}
            />
          );
        })}
      </div>
      {lastWin ? <KenoWinPopover win={lastWin} /> : null}
    </div>
  );
};
