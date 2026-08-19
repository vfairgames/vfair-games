import { PLINKO_MULTIPLIER_DECIMALS, type PlinkoRisk } from '@vfair/game-math';

const RISK_PALETTES: Record<
  PlinkoRisk,
  { main: [string, string]; highlight: [string, string] }
> = {
  easy: {
    main: ['#9ae6eb', '#037fef'],
    highlight: ['#f1faff', '#2895fa'],
  },
  medium: {
    main: ['#a9e61c', '#0fa112'],
    highlight: ['#e8ffbd', '#00be0e'],
  },
  hard: {
    main: ['#ea98f8', '#a346e0'],
    highlight: ['#f3d1f8', '#b15aeb'],
  },
  expert: {
    main: ['#ffc200', '#f25816'],
    highlight: ['#ffe6c7', '#e58200'],
  },
};

const FOOTER_WIDTH_PERCENT_BY_COUNT: Record<number, number> = {
  9: 85,
  10: 82.5,
  11: 81.2,
  12: 80.2,
  13: 79.2,
  14: 78.2,
  15: 77.5,
  16: 77,
  17: 76.4,
};

const parseHex = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '');
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
};

const formatRgb = ([r, g, b]: [number, number, number]): string =>
  `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

const lerpChannel = (from: number, to: number, t: number): number =>
  from + (to - from) * t;

const lerpHex = (from: string, to: string, t: number): string => {
  const a = parseHex(from);
  const b = parseHex(to);
  return formatRgb([
    lerpChannel(a[0], b[0], t),
    lerpChannel(a[1], b[1], t),
    lerpChannel(a[2], b[2], t),
  ]);
};

const sampleSymmetricScale = (
  count: number,
  edge: string,
  center: string,
): string[] => {
  if (count <= 1) {
    return [lerpHex(edge, center, 0)];
  }

  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);

    if (t <= 0.5) {
      return lerpHex(edge, center, t * 2);
    }

    return lerpHex(center, edge, (t - 0.5) * 2);
  });
};

export type PlinkoBucketPalette = {
  main: string;
  highlight: string;
};

export const getPlinkoBucketPalettes = (
  count: number,
  risk: PlinkoRisk,
): PlinkoBucketPalette[] => {
  const palette = RISK_PALETTES[risk];
  const mains = sampleSymmetricScale(count, palette.main[0], palette.main[1]);
  const highlights = sampleSymmetricScale(
    count,
    palette.highlight[0],
    palette.highlight[1],
  );

  return mains.map((main, index) => ({
    main,
    highlight: highlights[index] ?? main,
  }));
};

export const getPlinkoBucketsWidthPercent = (bucketCount: number): number =>
  FOOTER_WIDTH_PERCENT_BY_COUNT[bucketCount] ?? 80;

export const formatPlinkoBucketLabel = (value: number): string => {
  if (value >= 1000) {
    const thousands = Math.round((value / 1000) * 10) / 10;
    return Number.isInteger(thousands)
      ? `${thousands}K`
      : `${thousands.toFixed(1)}K`;
  }

  return Number(value.toFixed(PLINKO_MULTIPLIER_DECIMALS)).toString();
};
