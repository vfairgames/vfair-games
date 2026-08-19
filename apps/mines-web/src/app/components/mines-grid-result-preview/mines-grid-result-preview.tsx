import { MINES_GRID_SIZE } from '@vfair/game-math';

import { MinesTile } from '../mines-tile/mines-tile';

import './mines-grid-result-preview.scss';

type MinesGridResultPreviewProps = {
  mineLayout: readonly number[];
  playerRevealedTiles: readonly number[];
  gridSize?: number;
};

export const MinesGridResultPreview = ({
  mineLayout,
  playerRevealedTiles,
  gridSize = MINES_GRID_SIZE,
}: MinesGridResultPreviewProps) => {
  const mineSet = new Set(mineLayout);
  const playerSet = new Set(playerRevealedTiles);

  return (
    <div className="mines-grid-result-preview" aria-hidden="true">
      {Array.from({ length: gridSize }, (_, tile) => (
        <MinesTile
          key={tile}
          visualState={mineSet.has(tile) ? 'mine' : 'gem'}
          isDimmed={!playerSet.has(tile)}
          isRevealing={false}
          disabled
          onClick={() => undefined}
        />
      ))}
    </div>
  );
};
