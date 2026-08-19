type RequestMeta = {
  ipAddress: string | null;
  userAgent: string | null;
};

export type SignInRequest = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
};

const resolveIpAddress = (req: SignInRequest): string | null => {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }

  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]?.trim() ?? null;
  }

  return req.ip ?? req.socket.remoteAddress ?? null;
};

export const extractRequestMeta = (req: SignInRequest): RequestMeta => ({
  ipAddress: resolveIpAddress(req),
  userAgent:
    typeof req.headers['user-agent'] === 'string'
      ? req.headers['user-agent']
      : null,
});
