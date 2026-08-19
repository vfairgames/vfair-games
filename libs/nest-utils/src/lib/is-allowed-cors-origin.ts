export type CorsAllowlist = {
  extraOrigins: readonly string[];
  extraHosts: readonly string[];
};

const parseCsv = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const parseCorsAllowlist = (
  env: Record<string, string | undefined>,
): CorsAllowlist => ({
  extraOrigins: parseCsv(env['CORS_ORIGINS']),
  extraHosts: parseCsv(env['CORS_ALLOWED_HOSTS']),
});

const isAllowedHost = (
  hostname: string,
  extraHosts: readonly string[],
): boolean =>
  extraHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));

export const isAllowedCorsOrigin = (
  origin: string,
  allowlist: CorsAllowlist = parseCorsAllowlist(process.env),
): boolean => {
  if (allowlist.extraOrigins.includes(origin)) {
    return true;
  }

  let hostname: string;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    return false;
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }

  return isAllowedHost(hostname, allowlist.extraHosts);
};

export const resolveAllowedCorsOrigin = (
  origin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
): void => {
  if (!origin || isAllowedCorsOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
};
