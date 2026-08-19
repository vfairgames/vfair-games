import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useDiceGameStore } from '../../store/dice-game-store';
import { useIsDiceAutoBetInProgress } from '../../query/use-is-dice-bet-in-progress';
import { diceSoundService } from '../../services/dice-sound.service';
import { useDiceSlider } from '../../store/hooks/use-dice-slider';

import './dice-slider.scss';

const INDICATORS = [0, 25, 50, 75, 100] as const;
const BET_RESULT_FADE_DELAY_MS = 5000;

export const DiceSlider = () => {
  const isAutoBetInProgress = useIsDiceAutoBetInProgress();
  const {
    gameMode,
    sliderValue,
    diceIndicator,
    lastBetResult,
    betResultTransitionMs,
    patch,
  } = useDiceSlider();
  const diceOdds = useDiceGameStore((state) => state.diceOdds);
  const { min: sliderMin, max: sliderMax } =
    diceOdds.getLimits(gameMode).sliderValue;
  const rootRef = useRef<HTMLDivElement>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevSliderValueRef = useRef<number | undefined>(undefined);
  const [isBetResultVisible, setIsBetResultVisible] = useState(false);

  useEffect(() => {
    rootRef.current?.style.setProperty(
      '--dice-slider-bet-result-transition-time',
      `${betResultTransitionMs}ms`,
    );
  }, [betResultTransitionMs]);

  useEffect(() => {
    rootRef.current?.style.setProperty(
      '--dice-slider-progress',
      `${Math.min(100, Math.max(0, sliderValue))}%`,
    );
  }, [sliderValue]);

  useEffect(() => {
    const clearFadeTimeout = () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };

    const sliderChanged =
      prevSliderValueRef.current !== undefined &&
      prevSliderValueRef.current !== sliderValue;

    prevSliderValueRef.current = sliderValue;

    if (sliderChanged) {
      setIsBetResultVisible(false);
      clearFadeTimeout();
      return;
    }

    if (!lastBetResult) {
      return;
    }

    setIsBetResultVisible(true);
    clearFadeTimeout();
    fadeTimeoutRef.current = setTimeout(() => {
      setIsBetResultVisible(false);
    }, BET_RESULT_FADE_DELAY_MS);

    return clearFadeTimeout;
  }, [sliderValue, lastBetResult]);

  const loseIsLeft = gameMode === 'rollOver';
  const dimLose = isBetResultVisible && lastBetResult?.status === 'won';
  const dimWin = isBetResultVisible && lastBetResult?.status === 'lost';
  const dimLeftSection = (dimLose && loseIsLeft) || (dimWin && !loseIsLeft);
  const dimRightSection = (dimLose && !loseIsLeft) || (dimWin && loseIsLeft);

  const handleSliderChange = useCallback(
    (value: number) => {
      if (isAutoBetInProgress) {
        return;
      }

      const nextValue =
        value < sliderMin
          ? Math.ceil(sliderMin)
          : value > sliderMax
            ? Math.floor(sliderMax)
            : value;

      if (nextValue === sliderValue) {
        return;
      }

      diceSoundService.playSlider();
      patch({ sliderValue: nextValue });
    },
    [isAutoBetInProgress, patch, sliderMin, sliderMax, sliderValue],
  );

  return (
    <div
      ref={rootRef}
      className={clsx(
        'dice-slider',
        gameMode === 'rollOver'
          ? 'dice-slider--roll-over'
          : 'dice-slider--roll-under',
        isAutoBetInProgress && 'dice-slider--bet-in-progress',
      )}
    >
      <div className="dice-slider__container">
        <div className="dice-slider__inner">
          <div className="dice-slider__track">
            <div
              className={clsx(
                'dice-slider__side dice-slider__side--left',
                dimLeftSection && 'dice-slider__side--dimmed',
              )}
            />
            <div
              className={clsx(
                'dice-slider__side dice-slider__side--right',
                dimRightSection && 'dice-slider__side--dimmed',
              )}
            />
            <input
              className="dice-slider__input"
              type="range"
              min={0}
              max={100}
              step={1}
              value={sliderValue}
              disabled={isAutoBetInProgress}
              onChange={(event) =>
                handleSliderChange(Number(event.target.value))
              }
            />
            <div className="dice-slider__thumb" />
            <div
              className={clsx(
                'dice-slider__bet-result',
                isBetResultVisible && 'dice-slider__bet-result--visible',
              )}
              style={{ transform: `translateX(${diceIndicator}%)` }}
            >
              <div className="dice-slider__bet-result-line" />
              <div
                className={clsx(
                  'dice-slider__bet-result-value',
                  lastBetResult?.status === 'won' &&
                    'dice-slider__bet-result-value--won',
                )}
              >
                {diceIndicator.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="dice-slider__indicators">
        {INDICATORS.map((tick) => (
          <div key={tick} className="dice-slider__indicator" data-value={tick}>
            <span className="dice-slider__indicator-tick" />
            <span className="dice-slider__indicator-label">{tick}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
