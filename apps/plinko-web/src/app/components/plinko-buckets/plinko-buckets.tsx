import clsx from 'clsx';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import type { PlinkoRisk } from '@vfair/game-math';

import { usePlinkoForm } from '../../store/hooks/use-plinko-form';

import {
  formatPlinkoBucketLabel,
  getPlinkoBucketPalettes,
  getPlinkoBucketsWidthPercent,
  type PlinkoBucketPalette,
} from './plinko-bucket-styles';

import './plinko-buckets.scss';

const SLIDE_DURATION_MS = 300;
const SCALE_DURATION_MS = 800;
const COLOR_HIGHLIGHT_MIN_MULTIPLIER = 7;
const SCALE_MIN_MULTIPLIER = 10_000;

export type PlinkoBucketPulses = Readonly<Record<number, number>>;

type PlinkoBucketsProps = {
  pulses: PlinkoBucketPulses;
  rows: number;
};

type PlinkoBucketProps = {
  index: number;
  multiplier: number;
  isHighestRatio: boolean;
  pulseId: number | undefined;
  palette: PlinkoBucketPalette;
};

const restartCssFlag = (
  setActive: Dispatch<SetStateAction<boolean>>,
  timeoutRef: { current: number | null },
  durationMs: number,
): number | null => {
  if (timeoutRef.current !== null) {
    window.clearTimeout(timeoutRef.current);
  }

  let rafId: number | null = null;

  setActive((wasActive) => {
    if (wasActive) {
      rafId = requestAnimationFrame(() => {
        setActive(true);
      });
      return false;
    }

    return true;
  });

  timeoutRef.current = window.setTimeout(() => {
    setActive(false);
    timeoutRef.current = null;
  }, durationMs);

  return rafId;
};

const PlinkoBucket = ({
  index,
  multiplier,
  isHighestRatio,
  pulseId,
  palette,
}: PlinkoBucketProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const [isScaling, setIsScaling] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isColorTransitioning, setIsColorTransitioning] = useState(false);
  const slideTimeoutRef = useRef<number | null>(null);
  const scaleTimeoutRef = useRef<number | null>(null);
  const colorTimeoutRef = useRef<number | null>(null);
  const rafIdsRef = useRef<number[]>([]);

  const canScale = isHighestRatio && multiplier >= SCALE_MIN_MULTIPLIER;
  const canHighlight = multiplier >= COLOR_HIGHLIGHT_MIN_MULTIPLIER;
  const slideDurationMs = isHighestRatio
    ? SCALE_DURATION_MS
    : SLIDE_DURATION_MS;
  const colorSwapDurationMs = canScale
    ? SCALE_DURATION_MS * 0.1
    : SLIDE_DURATION_MS;
  const canScaleRef = useRef(canScale);
  const canHighlightRef = useRef(canHighlight);
  const slideDurationMsRef = useRef(slideDurationMs);

  canScaleRef.current = canScale;
  canHighlightRef.current = canHighlight;
  slideDurationMsRef.current = slideDurationMs;

  useEffect(() => {
    if (pulseId === undefined) {
      return;
    }

    const rafIds: number[] = [];
    const trackRaf = (rafId: number | null) => {
      if (rafId !== null) {
        rafIds.push(rafId);
      }
    };
    const shouldScale = canScaleRef.current;
    const shouldHighlight = canHighlightRef.current;
    const activeSlideDurationMs = slideDurationMsRef.current;

    trackRaf(
      restartCssFlag(setIsSliding, slideTimeoutRef, activeSlideDurationMs),
    );

    if (shouldScale) {
      trackRaf(
        restartCssFlag(setIsScaling, scaleTimeoutRef, SCALE_DURATION_MS),
      );
    }

    if (shouldHighlight) {
      if (colorTimeoutRef.current !== null) {
        window.clearTimeout(colorTimeoutRef.current);
      }

      setIsColorTransitioning(false);
      setIsHighlighted(true);

      if (shouldScale) {
        colorTimeoutRef.current = window.setTimeout(() => {
          setIsColorTransitioning(true);
          setIsHighlighted(false);
          colorTimeoutRef.current = null;
        }, SCALE_DURATION_MS * 0.9);
      } else {
        rafIds.push(
          requestAnimationFrame(() => {
            setIsColorTransitioning(true);
            setIsHighlighted(false);
          }),
        );
      }
    }

    rafIdsRef.current = rafIds;

    return () => {
      rafIds.forEach((rafId) => {
        cancelAnimationFrame(rafId);
      });
    };
  }, [pulseId]);

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    root.style.setProperty(
      'background',
      isHighlighted ? palette.highlight : palette.main,
    );
    root.style.setProperty(
      'box-shadow',
      `0 0.18em 0 0 ${isHighlighted ? palette.main : palette.highlight}`,
    );
    root.style.setProperty('--plinko-slide-duration', `${slideDurationMs}ms`);
    root.style.setProperty('--plinko-scale-duration', `${SCALE_DURATION_MS}ms`);
    root.style.setProperty(
      '--plinko-color-swap-duration',
      `${colorSwapDurationMs}ms`,
    );
  }, [isHighlighted, palette, slideDurationMs, colorSwapDurationMs]);

  useEffect(
    () => () => {
      if (slideTimeoutRef.current !== null) {
        window.clearTimeout(slideTimeoutRef.current);
      }

      if (scaleTimeoutRef.current !== null) {
        window.clearTimeout(scaleTimeoutRef.current);
      }

      if (colorTimeoutRef.current !== null) {
        window.clearTimeout(colorTimeoutRef.current);
      }

      rafIdsRef.current.forEach((rafId) => {
        cancelAnimationFrame(rafId);
      });
    },
    [],
  );

  return (
    <div
      ref={rootRef}
      className={clsx(
        'plinko-buckets__bucket',
        isSliding && 'plinko-buckets__bucket--sliding',
        isScaling && 'plinko-buckets__bucket--scaling',
        isColorTransitioning && 'plinko-buckets__bucket--color-transition',
      )}
      data-testid={`plinko-payout-${index}`}
    >
      <span className="plinko-buckets__label">
        {formatPlinkoBucketLabel(multiplier)}
      </span>
    </div>
  );
};

export const PlinkoBuckets = ({ pulses, rows }: PlinkoBucketsProps) => {
  const { form, plinkoOdds } = usePlinkoForm();
  const risk = form.risk as PlinkoRisk;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const multipliers = useMemo(
    () => plinkoOdds.getMultipliers(rows, risk),
    [rows, risk, plinkoOdds],
  );
  const palettes = useMemo(
    () => getPlinkoBucketPalettes(multipliers.length, risk),
    [multipliers.length, risk],
  );
  const widthPercent = getPlinkoBucketsWidthPercent(multipliers.length);
  const highestMultiplier = useMemo(
    () => Math.max(...multipliers, 0),
    [multipliers],
  );

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    root.style.setProperty('width', `${widthPercent}%`);
    root.style.setProperty(
      '--plinko-buckets-count',
      String(multipliers.length),
    );
  }, [widthPercent, multipliers.length]);

  return (
    <div ref={rootRef} className="plinko-buckets">
      <div className="plinko-buckets__grid">
        {multipliers.map((multiplier, index) => (
          <PlinkoBucket
            key={`${rows}-${risk}-${index}`}
            index={index}
            isHighestRatio={multiplier === highestMultiplier}
            multiplier={multiplier}
            palette={
              palettes[index] ?? {
                main: '#a9e61c',
                highlight: '#e8ffbd',
              }
            }
            pulseId={pulses[index]}
          />
        ))}
      </div>
    </div>
  );
};
