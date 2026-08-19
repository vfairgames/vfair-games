export const PLINKO_LOGICAL_WIDTH = 760;
export const PLINKO_LOGICAL_HEIGHT = 570;
export const PLINKO_SIDE_MARGIN = 70;
const PLINKO_MARGIN_TOP = 30;
const PLINKO_MARGIN_BOTTOM = 20;
const PLINKO_REFERENCE_ROWS = 16;
const PLINKO_PIN_RADIUS = 4;
export const PLINKO_BALL_RADIUS = 8;

export type PlinkoPoint = {
  x: number;
  y: number;
};

export type PlinkoPin = PlinkoPoint & {
  radius: number;
  collisionTime: number;
};

export type PlinkoBoardLayout = {
  pinSpacing: { width: number; height: number };
  pinRadius: number;
  ballRadius: number;
  marginTop: number;
  viewScale: number;
};

const REFERENCE_PIN_COLUMNS = PLINKO_REFERENCE_ROWS + 2;

export const buildPlinkoBoardLayout = (rows: number): PlinkoBoardLayout => ({
  pinSpacing: {
    width:
      (PLINKO_LOGICAL_WIDTH - PLINKO_SIDE_MARGIN * 2) / REFERENCE_PIN_COLUMNS,
    height:
      (PLINKO_LOGICAL_HEIGHT - 8 - PLINKO_MARGIN_TOP - PLINKO_MARGIN_BOTTOM) /
      (PLINKO_REFERENCE_ROWS - 1),
  },
  pinRadius: PLINKO_PIN_RADIUS,
  ballRadius: PLINKO_BALL_RADIUS,
  marginTop: PLINKO_MARGIN_TOP,
  viewScale: (PLINKO_REFERENCE_ROWS - 0.7) / Math.max(rows - 0.7, 1),
});

export const buildPlinkoPinRows = (rows: number): PlinkoPin[][] => {
  const layout = buildPlinkoBoardLayout(rows);
  const boardCenterX = PLINKO_LOGICAL_WIDTH / 2;
  const pinRows: PlinkoPin[][] = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const pinCount = 3 + rowIndex;
    const rowLeftX = boardCenterX - (pinCount / 2) * layout.pinSpacing.width;

    pinRows.push(
      Array.from({ length: pinCount }, (_, pinIndex) => ({
        x: rowLeftX + (pinIndex + 0.5) * layout.pinSpacing.width,
        y:
          rowIndex * layout.pinSpacing.height +
          layout.pinRadius +
          layout.marginTop,
        radius: layout.pinRadius,
        collisionTime: 0,
      })),
    );
  }

  return pinRows;
};

export const plinkoGapCenterX = (
  pins: PlinkoPoint[],
  gapIndex: number,
): number => {
  const leftPin = pins[gapIndex];
  const rightPin = pins[gapIndex + 1];

  if (!leftPin || !rightPin) {
    return pins[0]?.x ?? 0;
  }

  return (leftPin.x + rightPin.x) / 2;
};
