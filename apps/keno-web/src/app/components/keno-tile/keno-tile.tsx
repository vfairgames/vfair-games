import clsx from 'clsx';

import gemSvg from '../../../assets/gem.svg';

import './keno-tile.scss';

export type KenoTileVisualState = 'idle' | 'selected' | 'hit' | 'unselected';

type KenoTileProps = {
  number: number;
  visualState: KenoTileVisualState;
  isRevealing: boolean;
  disabled: boolean;
  selectionLocked?: boolean;
  instant?: boolean;
  onClick: () => void;
};

export const KenoTile = ({
  number,
  visualState,
  isRevealing,
  disabled,
  selectionLocked = false,
  instant = false,
  onClick,
}: KenoTileProps) => {
  const isRevealed = visualState === 'hit' || visualState === 'unselected';

  return (
    <button
      type="button"
      className={clsx(
        'keno-tile',
        visualState === 'selected' && 'keno-tile--selected',
        visualState === 'hit' && 'keno-tile--hit',
        visualState === 'unselected' && 'keno-tile--unselected',
        selectionLocked && 'keno-tile--selection-locked',
        instant && 'keno-tile--instant',
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <span
        className={clsx(
          'keno-tile__background',
          isRevealed && `keno-tile__background--${visualState}`,
        )}
        aria-hidden="true"
      />
      <span
        className={clsx(
          'keno-tile__cover',
          isRevealing && 'keno-tile__cover--revealing',
          isRevealed && 'keno-tile__cover--revealed',
        )}
        aria-hidden="true"
      />
      <span className="keno-tile__number">{number}</span>
      {visualState === 'hit' ? (
        <img className="keno-tile__gem" src={gemSvg} alt="" draggable={false} />
      ) : null}
    </button>
  );
};
