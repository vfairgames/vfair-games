import {
  partnerCodeFallback,
  partnerNameToCode,
  resolveUniquePartnerCode,
} from './partner-code';

describe('partnerNameToCode', () => {
  it('converts a simple name to snake_case', () => {
    expect(partnerNameToCode('Acme Gaming')).toBe('acme_gaming');
  });

  it('replaces hyphens and other separators with underscores', () => {
    expect(partnerNameToCode('Foo-Bar')).toBe('foo_bar');
  });

  it('trims whitespace and collapses repeated separators', () => {
    expect(partnerNameToCode('  Hello   World  ')).toBe('hello_world');
  });

  it('returns empty string when name has no alphanumeric characters', () => {
    expect(partnerNameToCode('!!!')).toBe('');
  });
});

describe('partnerCodeFallback', () => {
  it('uses partner id', () => {
    expect(partnerCodeFallback(42)).toBe('partner_42');
  });
});

describe('resolveUniquePartnerCode', () => {
  it('returns base code when available', async () => {
    const result = await resolveUniquePartnerCode(
      'acme_gaming',
      async () => false,
    );
    expect(result).toBe('acme_gaming');
  });

  it('appends numeric suffix when base code is taken', async () => {
    const taken = new Set(['hello_world', 'hello_world_2']);
    const result = await resolveUniquePartnerCode('hello_world', async (code) =>
      taken.has(code),
    );
    expect(result).toBe('hello_world_3');
  });
});
