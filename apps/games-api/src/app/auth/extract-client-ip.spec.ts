import { extractClientIp } from './extract-client-ip';

describe('extractClientIp', () => {
  it('uses req.ip from Express trust proxy', () => {
    expect(
      extractClientIp({
        ip: '203.0.113.10',
        socket: { remoteAddress: '10.0.0.1' },
      }),
    ).toBe('203.0.113.10');
  });

  it('falls back to socket.remoteAddress when req.ip is missing', () => {
    expect(
      extractClientIp({
        socket: { remoteAddress: '10.0.0.1' },
      }),
    ).toBe('10.0.0.1');
  });

  it('returns null when no address is available', () => {
    expect(extractClientIp({ socket: {} })).toBeNull();
  });
});
