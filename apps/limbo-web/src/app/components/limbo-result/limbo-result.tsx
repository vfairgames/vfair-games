import { Flex } from '@radix-ui/themes';
import clsx from 'clsx';
import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

import { useLimboGameStore } from '../../store/limbo-game-store';

import './limbo-result.scss';

const INITIAL_MULTIPLIER = 1;

export const LimboResult = () => {
  const lastResult = useLimboGameStore((state) => state.betResults.at(-1));
  const betResultTransitionMs = useLimboGameStore(
    (state) => state.betResultTransitionMs,
  );
  const reduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(INITIAL_MULTIPLIER);
  const [status, setStatus] = useState<'idle' | 'won' | 'lost'>('idle');

  useEffect(() => {
    if (!lastResult) {
      setDisplayValue(INITIAL_MULTIPLIER);
      setStatus('idle');
      return;
    }

    const target = lastResult.rolledMultiplier;
    const nextStatus = lastResult.status === 'won' ? 'won' : 'lost';

    if (reduceMotion || betResultTransitionMs === 0) {
      setDisplayValue(target);
      setStatus(nextStatus);
      return;
    }

    setDisplayValue(INITIAL_MULTIPLIER);
    setStatus('idle');

    const controls = animate(INITIAL_MULTIPLIER, target, {
      duration: betResultTransitionMs / 1000,
      ease: 'easeOut',
      onUpdate: (value) => setDisplayValue(value),
      onComplete: () => setStatus(nextStatus),
    });

    return () => controls.stop();
  }, [lastResult, betResultTransitionMs, reduceMotion]);

  return (
    <Flex className="limbo-result" align="center" justify="center" flexGrow="1">
      <span
        className={clsx(
          'limbo-result__multiplier',
          status === 'idle' && 'limbo-result__multiplier--idle',
          status === 'won' && 'limbo-result__multiplier--won',
          status === 'lost' && 'limbo-result__multiplier--lost',
        )}
      >
        {displayValue.toFixed(2)}×
      </span>
    </Flex>
  );
};
