import {
  PLINKO_LOGICAL_WIDTH,
  PLINKO_SIDE_MARGIN,
  buildPlinkoBoardLayout,
  buildPlinkoPinRows,
  type PlinkoBoardLayout,
  type PlinkoPin,
  type PlinkoPoint,
  plinkoGapCenterX,
} from './plinko-board-layout';

const GRAVITY = 0.4;
const RESTITUTION = 0.55;
const AIR_DRAG = 110;

export type PlinkoBallState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type PinCollision =
  | {
      hit: true;
      angleDegrees: number;
      pin: PlinkoPin;
      rowIndex: number;
      pinIndex: number;
    }
  | {
      hit: false;
    };

type DropSimulation = {
  bucketIndex: number;
  reachedBuckets: boolean;
  stepCount: number;
};

type StartPointCandidate = {
  startX: number;
  stepCount: number;
  distanceFromCenter: number;
};

const START_POINT_CACHE_VERSION = 'v9';
const START_POINT_SEARCH_STEP = 0.25;
const START_POINT_CENTER_BAND = 40;
const START_POINT_NEAR_CENTER_TOLERANCE = 6;
const MAX_SIMULATION_STEPS = 2_000;

const startPointCache = new Map<string, number>();

const angleBetweenPointsDegrees = (
  from: PlinkoPoint,
  to: PlinkoPoint,
): number => {
  let degrees = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;

  if (degrees < 0) {
    degrees += 360;
  }

  return 360 - degrees;
};

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const createPlinkoBall = (startX: number): PlinkoBallState => ({
  x: startX,
  y: 0,
  vx: 0,
  vy: 0,
});

const findPinCollision = (
  ball: PlinkoBallState,
  pins: PlinkoPin[][],
  layout: PlinkoBoardLayout,
): PinCollision => {
  if (pins.length === 0) {
    return { hit: false };
  }

  const rowIndex = Math.floor(
    Math.abs(
      (ball.y - layout.marginTop + pins[0][0].radius) /
        layout.pinSpacing.height,
    ),
  );
  const row = pins[rowIndex];

  if (!row) {
    return { hit: false };
  }

  for (let pinIndex = 0; pinIndex < row.length; pinIndex += 1) {
    const pin = row[pinIndex];
    const distance = Math.hypot(ball.x - pin.x, ball.y - pin.y);

    if (distance < layout.ballRadius + pin.radius) {
      return {
        hit: true,
        angleDegrees: angleBetweenPointsDegrees(pin, {
          x: ball.x,
          y: ball.y,
        }),
        pin,
        rowIndex,
        pinIndex,
      };
    }
  }

  return { hit: false };
};

export const stepPlinkoBall = (
  ball: PlinkoBallState,
  pins: PlinkoPin[][],
  layout: PlinkoBoardLayout,
  currentTimeMs: number,
): void => {
  const collision = findPinCollision(ball, pins, layout);

  if (collision.hit) {
    const radians = degreesToRadians(collision.angleDegrees);
    const sin = Math.sin(radians);
    const cos = Math.cos(radians);
    const clearance = layout.ballRadius + layout.pinRadius + 1e-5;

    ball.x = collision.pin.x + cos * clearance;
    ball.y = collision.pin.y - sin * clearance;
    ball.vx = cos * ball.vy * RESTITUTION;
    ball.vy = -sin * ball.vy * RESTITUTION;

    const row = pins[collision.rowIndex];

    if (row?.[collision.pinIndex]) {
      row[collision.pinIndex] = {
        ...row[collision.pinIndex],
        collisionTime: currentTimeMs,
      };
    }

    return;
  }

  const nextVy = ball.vy + GRAVITY;
  const nextVx = ball.vx - ball.vx / AIR_DRAG;
  ball.x += nextVx;
  ball.y += nextVy;
  ball.vx = nextVx;
  ball.vy = nextVy;
};

export const hasBallReachedBuckets = (
  ball: PlinkoBallState,
  pins: PlinkoPin[][],
  layout: PlinkoBoardLayout,
): boolean => {
  const lastRow = pins[pins.length - 1];

  if (!lastRow?.[0]) {
    return true;
  }

  return (
    ball.y >=
    lastRow[0].y +
      layout.pinSpacing.height -
      layout.pinRadius -
      layout.ballRadius
  );
};

const resolveLandedBucketIndex = (
  ball: PlinkoBallState,
  pins: PlinkoPin[][],
): number => {
  const lastRow = pins[pins.length - 1];

  if (!lastRow || lastRow.length < 2) {
    return 0;
  }

  let closestBucketIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let gapIndex = 0; gapIndex < lastRow.length - 1; gapIndex += 1) {
    const gapCenterX = plinkoGapCenterX(lastRow, gapIndex);
    const distance = Math.abs(ball.x - gapCenterX);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestBucketIndex = gapIndex;
    }
  }

  return closestBucketIndex;
};

const simulateDropFromStartX = (
  rows: number,
  startX: number,
): DropSimulation => {
  const pins = buildPlinkoPinRows(rows);
  const layout = buildPlinkoBoardLayout(rows);
  const ball = createPlinkoBall(startX);

  for (let step = 0; step < MAX_SIMULATION_STEPS; step += 1) {
    stepPlinkoBall(ball, pins, layout, step);

    if (hasBallReachedBuckets(ball, pins, layout)) {
      return {
        bucketIndex: resolveLandedBucketIndex(ball, pins),
        reachedBuckets: true,
        stepCount: step + 1,
      };
    }
  }

  return {
    bucketIndex: resolveLandedBucketIndex(ball, pins),
    reachedBuckets: false,
    stepCount: MAX_SIMULATION_STEPS,
  };
};

const pickNearestToCenter = (
  candidates: StartPointCandidate[],
  boardCenterX: number,
): number => {
  candidates.sort(
    (left, right) =>
      left.distanceFromCenter - right.distanceFromCenter ||
      left.stepCount - right.stepCount,
  );

  const nearestDistance = candidates[0]?.distanceFromCenter ?? 0;
  const nearCenterCandidates = candidates.filter(
    (candidate) =>
      candidate.distanceFromCenter <=
      nearestDistance + START_POINT_NEAR_CENTER_TOLERANCE,
  );
  const chosen =
    nearCenterCandidates[
      Math.floor(Math.random() * nearCenterCandidates.length)
    ] ?? candidates[0];

  return chosen?.startX ?? boardCenterX;
};

export const findPlinkoStartPoint = (
  rows: number,
  targetBucketIndex: number,
): number => {
  const cacheKey = `${START_POINT_CACHE_VERSION}:${rows}:${targetBucketIndex}`;
  const cachedStartX = startPointCache.get(cacheKey);

  if (cachedStartX !== undefined) {
    return cachedStartX;
  }

  const boardCenterX = PLINKO_LOGICAL_WIDTH / 2;
  const minStartX = PLINKO_SIDE_MARGIN;
  const maxStartX = PLINKO_LOGICAL_WIDTH - PLINKO_SIDE_MARGIN;
  const matchingBucket: StartPointCandidate[] = [];

  let fallbackStartX = boardCenterX;
  let closestBucketDistance = Number.POSITIVE_INFINITY;
  let closestCenterDistance = Number.POSITIVE_INFINITY;
  let fewestSteps = Number.POSITIVE_INFINITY;

  for (
    let startX = minStartX;
    startX <= maxStartX;
    startX += START_POINT_SEARCH_STEP
  ) {
    const simulation = simulateDropFromStartX(rows, startX);

    if (!simulation.reachedBuckets) {
      continue;
    }

    const distanceFromCenter = Math.abs(startX - boardCenterX);
    const candidate: StartPointCandidate = {
      startX,
      stepCount: simulation.stepCount,
      distanceFromCenter,
    };

    if (simulation.bucketIndex === targetBucketIndex) {
      matchingBucket.push(candidate);
    }

    const bucketDistance = Math.abs(simulation.bucketIndex - targetBucketIndex);

    if (
      bucketDistance < closestBucketDistance ||
      (bucketDistance === closestBucketDistance &&
        (distanceFromCenter < closestCenterDistance ||
          (distanceFromCenter === closestCenterDistance &&
            simulation.stepCount < fewestSteps)))
    ) {
      closestBucketDistance = bucketDistance;
      closestCenterDistance = distanceFromCenter;
      fewestSteps = simulation.stepCount;
      fallbackStartX = startX;
    }
  }

  let chosenStartX = fallbackStartX;

  if (matchingBucket.length > 0) {
    const nearCenterMatches = matchingBucket.filter(
      (candidate) => candidate.distanceFromCenter <= START_POINT_CENTER_BAND,
    );
    chosenStartX = pickNearestToCenter(
      nearCenterMatches.length > 0 ? nearCenterMatches : matchingBucket,
      boardCenterX,
    );
  }

  startPointCache.set(cacheKey, chosenStartX);
  return chosenStartX;
};
