import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { useMainStore } from '@vfair/games-web-shell';

import {
  usePlinkoGameStore,
  type PlinkoDrop,
} from '../../store/plinko-game-store';

import {
  PLINKO_BALL_RADIUS,
  PLINKO_LOGICAL_HEIGHT,
  PLINKO_LOGICAL_WIDTH,
  buildPlinkoBoardLayout,
  buildPlinkoPinRows,
  type PlinkoBoardLayout,
  type PlinkoPin,
} from './plinko-board-layout';
import {
  createPlinkoBall,
  findPlinkoStartPoint,
  hasBallReachedBuckets,
  stepPlinkoBall,
  type PlinkoBallState,
} from './plinko-physics';

import './plinko-board.scss';

type PlinkoBoardProps = {
  rows: number;
  drops: PlinkoDrop[];
  onDropLand?: (dropId: string, bucketIndex: number) => void;
};

type FallingBall = {
  id: string;
  targetBucketIndex: number;
  state: PlinkoBallState;
  previousX: number;
  previousY: number;
  finished: boolean;
};

const PIN_FLASH_DURATION_MS = 300;
const PHYSICS_HZ = 60;
const PHYSICS_STEP_MS = 1000 / PHYSICS_HZ;
const MAX_PHYSICS_STEPS_PER_FRAME = 2;
const INSTANT_PHYSICS_SPEED = 2;
const DEFAULT_PIN_COLOR = '#ffffff';
const DEFAULT_BALL_COLOR = '#3e63dd';

const resolveThemeColor = (
  host: Element,
  cssVar: string,
  fallback: string,
): string => {
  const probe = document.createElement('span');
  probe.style.color = `var(${cssVar})`;
  host.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color || fallback;
};

const clearPinFlashes = (pins: PlinkoPin[][]): void => {
  pins.forEach((row) => {
    row.forEach((pin) => {
      pin.collisionTime = 0;
    });
  });
};

const hasActivePinFlashes = (pins: PlinkoPin[][], nowMs: number): boolean =>
  pins.some((row) =>
    row.some(
      (pin) =>
        pin.collisionTime !== 0 &&
        nowMs - pin.collisionTime < PIN_FLASH_DURATION_MS,
    ),
  );

const drawPins = (
  context: CanvasRenderingContext2D,
  pins: PlinkoPin[][],
  nowMs: number,
  pinColor: string,
): void => {
  pins.forEach((row) => {
    row.forEach((pin) => {
      context.save();

      if (pin.collisionTime !== 0) {
        const ageMs = nowMs - pin.collisionTime;

        if (ageMs < PIN_FLASH_DURATION_MS) {
          const progress = ageMs / PIN_FLASH_DURATION_MS;
          context.globalAlpha = (1 - progress) * 0.45;
          context.fillStyle = pinColor;
          context.beginPath();
          context.arc(
            pin.x,
            pin.y,
            pin.radius * 2.5 * progress + pin.radius,
            0,
            Math.PI * 2,
          );
          context.fill();
          context.globalAlpha = 1;
        } else {
          pin.collisionTime = 0;
        }
      }

      context.fillStyle = pinColor;
      context.beginPath();
      context.arc(pin.x, pin.y, pin.radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  });
};

const drawBallAt = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  ballColor: string,
): void => {
  context.save();
  context.beginPath();
  context.fillStyle = 'rgba(0, 0, 0, 0.25)';
  context.arc(x, y, PLINKO_BALL_RADIUS, 0, Math.PI * 2);
  context.fill();

  const drawY = y - 1;
  context.beginPath();
  context.fillStyle = ballColor;
  context.arc(x, drawY, PLINKO_BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.fillStyle = 'rgba(255, 255, 255, 0.35)';
  context.arc(x, drawY, PLINKO_BALL_RADIUS * 0.7, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.fillStyle = ballColor;
  context.arc(x, drawY, PLINKO_BALL_RADIUS * 0.4, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

const getInterpolatedBallPosition = (
  fallingBall: FallingBall,
  interpolationAlpha: number,
): { x: number; y: number } => {
  const alpha = Math.min(1, Math.max(0, interpolationAlpha));

  return {
    x:
      fallingBall.previousX +
      (fallingBall.state.x - fallingBall.previousX) * alpha,
    y:
      fallingBall.previousY +
      (fallingBall.state.y - fallingBall.previousY) * alpha,
  };
};

const syncBoardGeometry = (
  rows: number,
  pinsRef: { current: PlinkoPin[][] },
  layoutRef: { current: PlinkoBoardLayout },
): void => {
  pinsRef.current = buildPlinkoPinRows(rows);
  layoutRef.current = buildPlinkoBoardLayout(rows);
};

export const PlinkoBoard = ({ rows, drops, onDropLand }: PlinkoBoardProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const themeColorsRef = useRef({
    pin: DEFAULT_PIN_COLOR,
    ball: DEFAULT_BALL_COLOR,
  });
  const animationFrameRef = useRef<number | null>(null);
  const pinsRef = useRef(buildPlinkoPinRows(rows));
  const layoutRef = useRef(buildPlinkoBoardLayout(rows));
  const fallingBallsRef = useRef<FallingBall[]>([]);
  const onDropLandRef = useRef(onDropLand);
  const lastFrameTimeRef = useRef(0);
  const physicsTimeDebtMsRef = useRef(0);
  const isInstantBet = usePlinkoGameStore((state) => state.isInstantBet);
  const isInstantBetRef = useRef(isInstantBet);
  const appearance = useMainStore((state) => state.appearance);
  const lightAccentColor = useMainStore((state) => state.lightAccentColor);
  const darkAccentColor = useMainStore((state) => state.darkAccentColor);

  onDropLandRef.current = onDropLand;
  isInstantBetRef.current = isInstantBet;

  const syncThemeColors = useCallback(() => {
    const host = boardRef.current?.closest('.radix-themes') ?? boardRef.current;

    if (!host) {
      return;
    }

    themeColorsRef.current = {
      pin: resolveThemeColor(host, '--gray-12', DEFAULT_PIN_COLOR),
      ball: resolveThemeColor(host, '--accent-9', DEFAULT_BALL_COLOR),
    };
  }, []);

  const paint = useCallback((nowMs = Date.now(), interpolationAlpha = 0) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const { width, height } = canvas.getBoundingClientRect();

    if (width <= 0 || height <= 0) {
      return;
    }

    const layout = layoutRef.current;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * devicePixelRatio);
    canvas.height = Math.floor(height * devicePixelRatio);
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.save();
    context.scale(width / PLINKO_LOGICAL_WIDTH, height / PLINKO_LOGICAL_HEIGHT);

    const { viewScale } = layout;
    context.translate(
      (PLINKO_LOGICAL_WIDTH * (1 - viewScale)) / 2,
      layout.marginTop * (1 - viewScale),
    );
    context.scale(viewScale, viewScale);

    const { pin: pinColor, ball: ballColor } = themeColorsRef.current;

    drawPins(context, pinsRef.current, nowMs, pinColor);

    fallingBallsRef.current.forEach((fallingBall) => {
      if (fallingBall.finished) {
        return;
      }

      const position = getInterpolatedBallPosition(
        fallingBall,
        interpolationAlpha,
      );
      drawBallAt(context, position.x, position.y, ballColor);
    });

    context.restore();
  }, []);

  const refreshThemePaint = useCallback(() => {
    syncThemeColors();
    paint();
  }, [paint, syncThemeColors]);

  const ensureAnimationLoop = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    lastFrameTimeRef.current = 0;
    physicsTimeDebtMsRef.current = 0;

    const frame = (frameTimeMs: number) => {
      const nowMs = Date.now();

      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = frameTimeMs;
      }

      physicsTimeDebtMsRef.current += Math.min(
        frameTimeMs - lastFrameTimeRef.current,
        50,
      );
      lastFrameTimeRef.current = frameTimeMs;

      let stepsThisFrame = 0;
      const physicsPerTick = isInstantBetRef.current
        ? INSTANT_PHYSICS_SPEED
        : 1;
      const maxStepsThisFrame = MAX_PHYSICS_STEPS_PER_FRAME * physicsPerTick;

      while (
        physicsTimeDebtMsRef.current >= PHYSICS_STEP_MS &&
        stepsThisFrame < maxStepsThisFrame
      ) {
        physicsTimeDebtMsRef.current -= PHYSICS_STEP_MS;
        stepsThisFrame += physicsPerTick;

        for (let tick = 0; tick < physicsPerTick; tick += 1) {
          fallingBallsRef.current.forEach((fallingBall) => {
            if (fallingBall.finished) {
              return;
            }

            fallingBall.previousX = fallingBall.state.x;
            fallingBall.previousY = fallingBall.state.y;

            stepPlinkoBall(
              fallingBall.state,
              pinsRef.current,
              layoutRef.current,
              nowMs,
            );

            if (
              hasBallReachedBuckets(
                fallingBall.state,
                pinsRef.current,
                layoutRef.current,
              )
            ) {
              fallingBall.finished = true;
              onDropLandRef.current?.(
                fallingBall.id,
                fallingBall.targetBucketIndex,
              );
            }
          });
        }
      }

      fallingBallsRef.current = fallingBallsRef.current.filter(
        (fallingBall) => !fallingBall.finished,
      );
      paint(nowMs, physicsTimeDebtMsRef.current / PHYSICS_STEP_MS);

      const hasFallingBalls = fallingBallsRef.current.length > 0;
      const hasPinFlashes = hasActivePinFlashes(pinsRef.current, nowMs);

      if (!hasFallingBalls && !hasPinFlashes) {
        clearPinFlashes(pinsRef.current);
        animationFrameRef.current = null;
        lastFrameTimeRef.current = 0;
        physicsTimeDebtMsRef.current = 0;
        paint(Date.now());
        return;
      }

      animationFrameRef.current = requestAnimationFrame(frame);
    };

    animationFrameRef.current = requestAnimationFrame(frame);
  }, [paint]);

  useEffect(() => {
    syncBoardGeometry(rows, pinsRef, layoutRef);

    if (fallingBallsRef.current.length === 0) {
      clearPinFlashes(pinsRef.current);
    }

    refreshThemePaint();
  }, [rows, refreshThemePaint]);

  useLayoutEffect(() => {
    refreshThemePaint();

    const frameId = requestAnimationFrame(() => {
      refreshThemePaint();
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [appearance, lightAccentColor, darkAccentColor, refreshThemePaint]);

  useEffect(() => {
    const themeRoot = boardRef.current?.closest('.radix-themes');

    if (!themeRoot) {
      return;
    }

    const observer = new MutationObserver(() => {
      refreshThemePaint();
    });

    observer.observe(themeRoot, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-accent-color'],
    });

    return () => {
      observer.disconnect();
    };
  }, [refreshThemePaint]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(() => {
      paint();
    });

    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, [paint]);

  useEffect(() => {
    drops.forEach((drop) => {
      if (
        fallingBallsRef.current.some(
          (fallingBall) => fallingBall.id === drop.id,
        )
      ) {
        return;
      }

      if (pinsRef.current.length !== drop.rows) {
        syncBoardGeometry(drop.rows, pinsRef, layoutRef);
      }

      const startX = findPlinkoStartPoint(drop.rows, drop.bucketIndex);
      const state = createPlinkoBall(startX);

      fallingBallsRef.current.push({
        id: drop.id,
        targetBucketIndex: drop.bucketIndex,
        state,
        previousX: state.x,
        previousY: state.y,
        finished: false,
      });
    });

    if (
      fallingBallsRef.current.some((fallingBall) => !fallingBall.finished) ||
      hasActivePinFlashes(pinsRef.current, Date.now())
    ) {
      ensureAnimationLoop();
    } else {
      clearPinFlashes(pinsRef.current);
      paint();
    }
  }, [drops, ensureAnimationLoop, paint]);

  useEffect(
    () => () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    },
    [],
  );

  return (
    <div ref={boardRef} className="plinko-board">
      <canvas ref={canvasRef} className="plinko-board__canvas" />
    </div>
  );
};
