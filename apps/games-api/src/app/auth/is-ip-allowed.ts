import ipaddr from 'ipaddr.js';

const ALLOW_ALL_ENTRY = '*';

const ENTRY_SEPARATOR = /[\n,;]+/;

export const parseIpWhitelistEntries = (raw: string): string[] =>
  raw
    .split(ENTRY_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const matchesCidr = (
  clientIp: ipaddr.IPv4 | ipaddr.IPv6,
  entry: string,
): boolean => {
  const slashIndex = entry.lastIndexOf('/');
  if (slashIndex === -1) {
    try {
      const allowed = ipaddr.parse(entry);
      if (allowed.kind() !== clientIp.kind()) {
        return false;
      }
      return clientIp.toNormalizedString() === allowed.toNormalizedString();
    } catch {
      return false;
    }
  }

  const addressPart = entry.slice(0, slashIndex);
  const prefixPart = entry.slice(slashIndex + 1);
  const prefix = Number(prefixPart);

  if (!addressPart || !Number.isInteger(prefix)) {
    return false;
  }

  try {
    const range = ipaddr.parseCIDR(`${addressPart}/${prefix}`);
    if (range[0].kind() !== clientIp.kind()) {
      return false;
    }
    return clientIp.match(range);
  } catch {
    return false;
  }
};

export const isIpAllowed = (
  clientIp: string | null,
  whitelistRaw: string,
): boolean => {
  const entries = parseIpWhitelistEntries(whitelistRaw);

  if (entries.length === 0) {
    return false;
  }

  if (entries.some((entry) => entry === ALLOW_ALL_ENTRY)) {
    return entries.length === 1;
  }

  if (!clientIp) {
    return false;
  }

  let parsedClientIp: ipaddr.IPv4 | ipaddr.IPv6;

  try {
    parsedClientIp = ipaddr.parse(clientIp);
  } catch {
    return false;
  }

  return entries.some((entry) => matchesCidr(parsedClientIp, entry));
};
