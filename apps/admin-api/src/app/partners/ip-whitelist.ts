import ipaddr from 'ipaddr.js';

const ALLOW_ALL_ENTRY = '*';

const ENTRY_SEPARATOR = /[\n,;]+/;

export const parseIpWhitelistInput = (raw: string): string[] =>
  raw
    .split(ENTRY_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const validateIpWhitelistEntry = (entry: string): string | null => {
  if (entry === ALLOW_ALL_ENTRY) {
    return null;
  }

  const slashIndex = entry.lastIndexOf('/');
  if (slashIndex === -1) {
    try {
      ipaddr.parse(entry);
      return null;
    } catch {
      return `Invalid IP address: ${entry}`;
    }
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

  try {
    const parsed = ipaddr.parse(addressPart);
    const maxPrefix = parsed.kind() === 'ipv4' ? 32 : 128;
    if (prefix < 0 || prefix > maxPrefix) {
      return `Invalid CIDR prefix length: ${entry}`;
    }
    return null;
  } catch {
    return `Invalid CIDR notation: ${entry}`;
  }
};

export const validateIpWhitelist = (
  entries: string[],
): { valid: true } | { valid: false; message: string } => {
  if (entries.length === 0) {
    return {
      valid: false,
      message: 'IP whitelist must contain at least one entry',
    };
  }

  const hasAllowAll = entries.some((entry) => entry === ALLOW_ALL_ENTRY);
  if (hasAllowAll) {
    if (entries.length > 1) {
      return {
        valid: false,
        message: '"*" must be the only entry when allowing all IPs',
      };
    }
    return { valid: true };
  }

  for (const entry of entries) {
    const error = validateIpWhitelistEntry(entry);
    if (error) {
      return { valid: false, message: error };
    }
  }

  return { valid: true };
};

export const normalizeIpWhitelist = (raw: string): string => {
  const entries = parseIpWhitelistInput(raw);
  const validation = validateIpWhitelist(entries);
  if (validation.valid === false) {
    throw new Error(validation.message);
  }
  return entries.join('\n');
};
