import { z } from 'zod';

const ENTRY_SEPARATOR = /[\n,;]+/;

const parseIpWhitelistInput = (raw: string): string[] =>
  raw
    .split(ENTRY_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

const IPV6_PATTERN =
  /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;

const validateIpWhitelistEntry = (entry: string): string | null => {
  if (entry === '*') {
    return null;
  }

  const slashIndex = entry.lastIndexOf('/');
  if (slashIndex === -1) {
    if (IPV4_PATTERN.test(entry) || IPV6_PATTERN.test(entry)) {
      return null;
    }
    return `Invalid IP address: ${entry}`;
  }

  const addressPart = entry.slice(0, slashIndex);
  const prefixPart = entry.slice(slashIndex + 1);

  if (!addressPart || !prefixPart) {
    return `Invalid CIDR notation: ${entry}`;
  }

  const prefix = Number(prefixPart);
  if (!Number.isInteger(prefix)) {
    return `Invalid CIDR prefix: ${entry}`;
  }

  const isIpv4 = IPV4_PATTERN.test(addressPart);
  const isIpv6 = IPV6_PATTERN.test(addressPart);
  if (!isIpv4 && !isIpv6) {
    return `Invalid CIDR notation: ${entry}`;
  }

  const maxPrefix = isIpv4 ? 32 : 128;
  if (prefix < 0 || prefix > maxPrefix) {
    return `Invalid CIDR prefix length: ${entry}`;
  }

  return null;
};

const validateIpWhitelistInput = (raw: string): string | null => {
  const entries = parseIpWhitelistInput(raw);
  if (entries.length === 0) {
    return 'IP whitelist must contain at least one entry';
  }

  const hasAllowAll = entries.some((entry) => entry === '*');
  if (hasAllowAll) {
    if (entries.length > 1) {
      return '"*" must be the only entry when allowing all IPs';
    }
    return null;
  }

  for (const entry of entries) {
    const error = validateIpWhitelistEntry(entry);
    if (error) {
      return error;
    }
  }

  return null;
};

export const partnerAuthorizationFormSchema = z.object({
  ipWhitelist: z
    .string()
    .max(8192, 'IP whitelist must be at most 8192 characters')
    .superRefine((value, ctx) => {
      const error = validateIpWhitelistInput(value);
      if (error) {
        ctx.addIssue({
          code: 'custom',
          message: error,
        });
      }
    }),
});

export type PartnerAuthorizationFormValues = z.infer<
  typeof partnerAuthorizationFormSchema
>;

export const formatIpWhitelistForInput = (stored: string): string =>
  stored.split('\n').join('\n');

export const toIpWhitelistPayload = (value: string): string =>
  parseIpWhitelistInput(value).join('\n');
