import { randomUUID } from 'crypto';

export const partnerNameToCode = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const partnerCodeFallback = (partnerId: number): string =>
  `partner_${partnerId}`;

export const partnerCodeRandomFallback = (): string =>
  `partner_${randomUUID().replace(/-/g, '').slice(0, 8)}`;

export const resolveUniquePartnerCode = async (
  baseCode: string,
  isTaken: (code: string) => Promise<boolean>,
): Promise<string> => {
  if (!(await isTaken(baseCode))) {
    return baseCode;
  }

  let suffix = 2;
  while (await isTaken(`${baseCode}_${suffix}`)) {
    suffix += 1;
  }

  return `${baseCode}_${suffix}`;
};
