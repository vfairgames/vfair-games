import { randomBytes } from 'crypto';

export const generatePartnerSecret = (): string =>
  randomBytes(32).toString('hex');
