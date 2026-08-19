export type ReadinessIndicator = {
  checkReadiness(): Promise<void>;
};

export const READINESS_INDICATOR = Symbol('READINESS_INDICATOR');
