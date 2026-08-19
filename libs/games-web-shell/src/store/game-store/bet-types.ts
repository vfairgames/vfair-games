export const BET_MODES = ['manual', 'auto'] as const;

export type BetMode = (typeof BET_MODES)[number];

export const AUTO_BET_ADJUSTMENT_MODES = ['reset', 'increase'] as const;

export type AutoBetAdjustmentMode = (typeof AUTO_BET_ADJUSTMENT_MODES)[number];
