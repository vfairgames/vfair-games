export type ClientIpRequest = {
  ip?: string;
  socket: { remoteAddress?: string };
};

export const extractClientIp = (req: ClientIpRequest): string | null =>
  req.ip ?? req.socket.remoteAddress ?? null;
