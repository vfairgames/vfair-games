export const parseOptionalAmount = (value: string): number | undefined => {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};
