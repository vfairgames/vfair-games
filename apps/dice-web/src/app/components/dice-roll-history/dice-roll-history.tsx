import { Flex } from '@radix-ui/themes';
import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Target, Transition } from 'motion/react';
import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useTranslation } from '@vfair/games-web-shell';
import {
  type DiceBetResultRecord,
  useDiceGameStore,
} from '../../store/dice-game-store';

import './dice-roll-history.scss';

const MAX_VISIBLE_RESULTS = 5;

const FADE_OPACITY: Record<number, number> = {
  0: 0.15,
  1: 0.25,
  2: 0.5,
  3: 0.75,
  4: 1,
};

const ENTER_MOTION: Target = { opacity: 0, scale: 0.85, x: 8 };
const EXIT_MOTION: Target = { opacity: 0, scale: 0.85, x: -8 };

const getFadeStep = (index: number, total: number): number =>
  MAX_VISIBLE_RESULTS - total + index;

const getItemTransition = (transitionMs: number): Transition => ({
  duration: (transitionMs / 1000) * 0.4,
  ease: 'easeOut',
});

const getStatusClassName = (status: DiceBetResultRecord['status']) =>
  status === 'won'
    ? 'dice-roll-history__item--won'
    : 'dice-roll-history__item--lost';

type StaticHistoryItemProps = {
  fadeStep: number;
  result: DiceBetResultRecord;
};

const StaticHistoryItem = ({ fadeStep, result }: StaticHistoryItemProps) => (
  <span
    className={clsx(
      'dice-roll-history__item',
      `dice-roll-history__item--fade-${fadeStep}`,
      getStatusClassName(result.status),
    )}
    role="listitem"
  >
    {result.rolledValue.toFixed(2)}
  </span>
);

type AnimatedHistoryItemProps = {
  fadeOpacity: number;
  result: DiceBetResultRecord;
  transition: Transition;
};

const AnimatedHistoryItem = memo(
  ({ fadeOpacity, result, transition }: AnimatedHistoryItemProps) => (
    <motion.span
      animate={{ opacity: fadeOpacity, scale: 1, x: 0 }}
      className={clsx(
        'dice-roll-history__item',
        getStatusClassName(result.status),
      )}
      exit={EXIT_MOTION}
      initial={ENTER_MOTION}
      layout="position"
      role="listitem"
      transition={{ ...transition, layout: transition }}
    >
      {result.rolledValue.toFixed(2)}
    </motion.span>
  ),
);

AnimatedHistoryItem.displayName = 'AnimatedHistoryItem';

export const DiceRollHistory = () => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const betResultTransitionMs = useDiceGameStore(
    (state) => state.betResultTransitionMs,
  );
  const recentResults = useDiceGameStore(
    useShallow((state) => state.betResults.slice(-MAX_VISIBLE_RESULTS)),
  );
  const shouldAnimate = !reduceMotion && betResultTransitionMs > 0;
  const itemTransition = useMemo(
    () => getItemTransition(betResultTransitionMs),
    [betResultTransitionMs],
  );

  if (recentResults.length === 0) {
    return null;
  }

  return (
    <Flex
      align="center"
      className="dice-roll-history"
      gap="1"
      role="list"
      aria-label={t('diceRecentRollResults')}
    >
      {shouldAnimate ? (
        <AnimatePresence mode="popLayout" initial>
          {recentResults.map((result, index) => (
            <AnimatedHistoryItem
              key={result.id}
              fadeOpacity={
                FADE_OPACITY[getFadeStep(index, recentResults.length)] ?? 1
              }
              result={result}
              transition={itemTransition}
            />
          ))}
        </AnimatePresence>
      ) : (
        recentResults.map((result, index) => (
          <StaticHistoryItem
            key={result.id}
            fadeStep={getFadeStep(index, recentResults.length)}
            result={result}
          />
        ))
      )}
    </Flex>
  );
};
