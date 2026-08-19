import clsx from 'clsx';
import { motion, useReducedMotion } from 'motion/react';

import { useMainStore } from '@vfair/games-web-shell';

import {
  useKenoGameStore,
  type KenoLastWin,
} from '../../store/keno-game-store';

import './keno-win-popover.scss';

type KenoWinPopoverProps = {
  win: KenoLastWin;
};

export const KenoWinPopover = ({ win }: KenoWinPopoverProps) => {
  const formatCurrency = useMainStore((state) => state.formatCurrency);
  const countryCode = useMainStore((state) => state.countryCode);
  const currency = useMainStore((state) => state.currency);
  const betResultTransitionMs = useKenoGameStore(
    (state) => state.betResultTransitionMs,
  );
  const reduceMotion = useReducedMotion();
  const shouldAnimate = !reduceMotion && betResultTransitionMs > 0;

  return (
    <motion.div
      className="keno-win-popover"
      role="status"
      aria-live="polite"
      initial={
        shouldAnimate
          ? { scale: 0.72, x: '-50%', y: '-50%' }
          : { scale: 1, x: '-50%', y: '-50%' }
      }
      animate={{ scale: 1, x: '-50%', y: '-50%' }}
      transition={
        shouldAnimate ? { duration: 0.22, ease: 'easeOut' } : { duration: 0 }
      }
    >
      <div className="keno-win-popover__multiplier">
        {win.multiplier.toFixed(2)}x
      </div>
      <div className="keno-win-popover__divider" aria-hidden="true" />
      <div className="keno-win-popover__payout">
        <span>{formatCurrency(win.payout)}</span>
        <span
          title={currency}
          className={clsx(
            `fi fi-${countryCode.toLowerCase()}`,
            'keno-win-popover__flag',
          )}
        />
      </div>
    </motion.div>
  );
};
