import {
  normalizeIpWhitelist,
  parseIpWhitelistInput,
  validateIpWhitelist,
} from './ip-whitelist';

describe('parseIpWhitelistInput', () => {
  it('splits on newlines', () => {
    expect(parseIpWhitelistInput('203.0.113.0/24\n198.51.100.5')).toEqual([
      '203.0.113.0/24',
      '198.51.100.5',
    ]);
  });

  it('splits on commas and semicolons', () => {
    expect(parseIpWhitelistInput('1.1.1.1, 2.2.2.2; 3.3.3.3')).toEqual([
      '1.1.1.1',
      '2.2.2.2',
      '3.3.3.3',
    ]);
  });

  it('trims entries and drops empty lines', () => {
    expect(parseIpWhitelistInput('  1.1.1.1  \n\n  2.2.2.2  ')).toEqual([
      '1.1.1.1',
      '2.2.2.2',
    ]);
  });
});

describe('validateIpWhitelist', () => {
  it('accepts allow-all wildcard', () => {
    expect(validateIpWhitelist(['*'])).toEqual({ valid: true });
  });

  it('accepts single IPv4 and IPv6 addresses', () => {
    expect(validateIpWhitelist(['203.0.113.1'])).toEqual({ valid: true });
    expect(validateIpWhitelist(['2001:db8::1'])).toEqual({ valid: true });
  });

  it('accepts CIDR ranges', () => {
    expect(validateIpWhitelist(['203.0.113.0/24'])).toEqual({ valid: true });
    expect(validateIpWhitelist(['2001:db8::/32'])).toEqual({ valid: true });
  });

  it('rejects empty list', () => {
    expect(validateIpWhitelist([])).toEqual({
      valid: false,
      message: 'IP whitelist must contain at least one entry',
    });
  });

  it('rejects wildcard mixed with other entries', () => {
    expect(validateIpWhitelist(['*', '1.1.1.1'])).toEqual({
      valid: false,
      message: '"*" must be the only entry when allowing all IPs',
    });
  });

  it('rejects invalid IP addresses', () => {
    const result = validateIpWhitelist(['not-an-ip']);
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.message).toContain('Invalid IP address');
    }
  });

  it('rejects invalid CIDR notation', () => {
    const result = validateIpWhitelist(['203.0.113.0/99']);
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.message).toContain('Invalid CIDR prefix length');
    }
  });
});

describe('normalizeIpWhitelist', () => {
  it('normalizes to newline-separated entries', () => {
    expect(normalizeIpWhitelist('203.0.113.0/24, 198.51.100.5')).toBe(
      '203.0.113.0/24\n198.51.100.5',
    );
  });

  it('preserves allow-all wildcard', () => {
    expect(normalizeIpWhitelist('*')).toBe('*');
  });

  it('throws on invalid input', () => {
    expect(() => normalizeIpWhitelist('bad-ip')).toThrow('Invalid IP address');
  });
});
