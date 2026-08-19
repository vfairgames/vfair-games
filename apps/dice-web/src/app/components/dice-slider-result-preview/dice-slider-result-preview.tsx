import type { DiceGameMode } from '@vfair/game-contracts';
import { Card } from '@radix-ui/themes';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';

import './dice-slider-result-preview.scss';

const INDICATORS = [0, 25, 50, 75, 100] as const;

type DiceSliderResultPreviewProps = {
  gameMode: DiceGameMode;
  sliderValue: number;
  rolledValue: number;
  status: 'won' | 'lost';
};

export const DiceSliderResultPreview = ({
  gameMode,
  sliderValue,
  rolledValue,
  status,
}: DiceSliderResultPreviewProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const loseIsLeft = gameMode === 'rollOver';
  const dimLose = status === 'won';
  const dimWin = status === 'lost';
  const dimLeftSection = (dimLose && loseIsLeft) || (dimWin && !loseIsLeft);
  const dimRightSection = (dimLose && !loseIsLeft) || (dimWin && loseIsLeft);

  useEffect(() => {
    rootRef.current?.style.setProperty(
      '--dice-slider-progress',
      `${Math.min(100, Math.max(0, sliderValue))}%`,
    );
    rootRef.current?.style.setProperty(
      '--dice-slider-result-position',
      `${rolledValue}%`,
    );
  }, [rolledValue, sliderValue]);

  return (
    <Card asChild variant="surface">
      <div
        ref={rootRef}
        className={clsx(
          'dice-slider-result-preview',
          gameMode === 'rollOver'
            ? 'dice-slider-result-preview--roll-over'
            : 'dice-slider-result-preview--roll-under',
        )}
      >
        <div className="dice-slider-result-preview__container">
          <div className="dice-slider-result-preview__inner">
            <div className="dice-slider-result-preview__track">
              <div
                className={clsx(
                  'dice-slider-result-preview__side dice-slider-result-preview__side--left',
                  dimLeftSection && 'dice-slider-result-preview__side--dimmed',
                )}
              />
              <div
                className={clsx(
                  'dice-slider-result-preview__side dice-slider-result-preview__side--right',
                  dimRightSection && 'dice-slider-result-preview__side--dimmed',
                )}
              />
              <div className="dice-slider-result-preview__thumb" />
              <div className="dice-slider-result-preview__result">
                <div className="dice-slider-result-preview__result-line" />
                <div
                  className={clsx(
                    'dice-slider-result-preview__result-value',
                    status === 'won' &&
                      'dice-slider-result-preview__result-value--won',
                  )}
                >
                  {rolledValue.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="dice-slider-result-preview__indicators">
          {INDICATORS.map((tick) => (
            <div
              key={tick}
              className="dice-slider-result-preview__indicator"
              data-value={tick}
            >
              <span className="dice-slider-result-preview__indicator-tick" />
              <span className="dice-slider-result-preview__indicator-label">
                {tick}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
