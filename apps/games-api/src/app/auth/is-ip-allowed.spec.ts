import { isIpAllowed, parseIpWhitelistEntries } from './is-ip-allowed';

describe('parseIpWhitelistEntries', () => {
  it('parses comma and newline separated entries', () => {
    expect(
      parseIpWhitelistEntries('127.0.0.1, 10.0.0.0/8\n192.168.0.1'),
    ).toEqual(['127.0.0.1', '10.0.0.0/8', '192.168.0.1']);
  });
});

describe('isIpAllowed', () => {
  it('allows all when whitelist is *', () => {
    expect(isIpAllowed('203.0.113.10', '*')).toBe(true);
  });

  it('matches exact IPv4 addresses', () => {
    expect(isIpAllowed('127.0.0.1', '127.0.0.1')).toBe(true);
    expect(isIpAllowed('127.0.0.2', '127.0.0.1')).toBe(false);
  });

  it('matches CIDR ranges', () => {
    expect(isIpAllowed('10.1.2.3', '10.0.0.0/8')).toBe(true);
    expect(isIpAllowed('11.0.0.1', '10.0.0.0/8')).toBe(false);
  });

  it('rejects missing client IP for restricted whitelist', () => {
    expect(isIpAllowed(null, '127.0.0.1')).toBe(false);
  });
});
