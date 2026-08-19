import { Flex } from '@radix-ui/themes';
import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Target, Transition } from 'motion/react';
import { memo, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useTranslation } from '@vfair/games-web-shell';
import {
  type LimboBetResultRecord,
  useLimboGameStore,
} from '../../store/limbo-game-store';

import './limbo-roll-history.scss';

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

const getStatusClassName = (status: LimboBetResultRecord['status']) =>
  status === 'won'
    ? 'limbo-roll-history__item--won'
    : 'limbo-roll-history__item--lost';

const formatMultiplier = (value: number) => `${value.toFixed(2)}×`;

type StaticHistoryItemProps = {
  fadeStep: number;
  result: LimboBetResultRecord;
};

const StaticHistoryItem = ({ fadeStep, result }: StaticHistoryItemProps) => (
  <span
    className={clsx(
      'limbo-roll-history__item',
      `limbo-roll-history__item--fade-${fadeStep}`,
      getStatusClassName(result.status),
    )}
    role="listitem"
  >
    {formatMultiplier(result.rolledMultiplier)}
  </span>
);

type AnimatedHistoryItemProps = {
  fadeOpacity: number;
  result: LimboBetResultRecord;
  transition: Transition;
};

const AnimatedHistoryItem = memo(
  ({ fadeOpacity, result, transition }: AnimatedHistoryItemProps) => (
    <motion.span
      animate={{ opacity: fadeOpacity, scale: 1, x: 0 }}
      className={clsx(
        'limbo-roll-history__item',
        getStatusClassName(result.status),
      )}
      exit={EXIT_MOTION}
      initial={ENTER_MOTION}
      layout="position"
      role="listitem"
      transition={{ ...transition, layout: transition }}
    >
      {formatMultiplier(result.rolledMultiplier)}
    </motion.span>
  ),
);

AnimatedHistoryItem.displayName = 'AnimatedHistoryItem';

export const LimboRollHistory = () => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const betResultTransitionMs = useLimboGameStore(
    (state) => state.betResultTransitionMs,
  );
  const recentResults = useLimboGameStore(
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
      className="limbo-roll-history"
      gap="1"
      role="list"
      aria-label={t('limboRecentRollResults')}
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
