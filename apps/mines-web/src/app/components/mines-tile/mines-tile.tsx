import clsx from 'clsx';

import bombSvg from '../../../assets/bomb.svg';
import gemSvg from '../../../assets/gem.svg';

import './mines-tile.scss';

export type MinesTileVisualState =
  | 'idle'
  | 'selected'
  | 'gem'
  | 'mine'
  | 'unrevealed';

type MinesTileProps = {
  visualState: MinesTileVisualState;
  isDimmed: boolean;
  isRevealing: boolean;
  disabled: boolean;
  instant?: boolean;
  onClick: () => void;
};

export const MinesTile = ({
  visualState,
  isDimmed,
  isRevealing,
  disabled,
  instant = false,
  onClick,
}: MinesTileProps) => {
  const isRevealed = visualState === 'gem' || visualState === 'mine';

  return (
    <button
      type="button"
      className={clsx(
        'mines-tile',
        visualState === 'selected' && 'mines-tile--selected',
        isDimmed && 'mines-tile--dimmed',
        instant && 'mines-tile--instant',
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <span
        className={clsx(
          'mines-tile__background',
          isRevealed && `mines-tile__background--${visualState}`,
        )}
        aria-hidden="true"
      />
      <span
        className={clsx(
          'mines-tile__cover',
          isRevealing && 'mines-tile__cover--revealing',
          isRevealed && 'mines-tile__cover--revealed',
        )}
        aria-hidden="true"
      />
      {isRevealed ? (
        <img
          className={
            visualState === 'gem' ? 'mines-tile__gem' : 'mines-tile__mine'
          }
          src={visualState === 'gem' ? gemSvg : bombSvg}
          alt=""
          draggable={false}
        />
      ) : null}
    </button>
  );
};
