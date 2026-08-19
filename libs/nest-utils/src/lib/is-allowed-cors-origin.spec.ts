import {
  isAllowedCorsOrigin,
  parseCorsAllowlist,
  resolveAllowedCorsOrigin,
} from './is-allowed-cors-origin';

describe('isAllowedCorsOrigin', () => {
  const allowlist = parseCorsAllowlist({
    CORS_ORIGINS: 'https://admin.example.com',
    CORS_ALLOWED_HOSTS: 'example.com',
  });

  it('allows configured hosts and exact origins', () => {
    expect(isAllowedCorsOrigin('https://example.com', allowlist)).toBe(true);
    expect(isAllowedCorsOrigin('https://dice.example.com', allowlist)).toBe(
      true,
    );
    expect(isAllowedCorsOrigin('https://admin.example.com', allowlist)).toBe(
      true,
    );
  });

  it('allows localhost for local development', () => {
    expect(isAllowedCorsOrigin('http://localhost:4200')).toBe(true);
    expect(isAllowedCorsOrigin('http://127.0.0.1:4200')).toBe(true);
  });

  it('rejects other hosts', () => {
    expect(isAllowedCorsOrigin('https://evil.com', allowlist)).toBe(false);
    expect(isAllowedCorsOrigin('https://example.com.evil.com', allowlist)).toBe(
      false,
    );
    expect(
      isAllowedCorsOrigin('https://dice-web.unrelated.host', allowlist),
    ).toBe(false);
    expect(isAllowedCorsOrigin('not-a-url', allowlist)).toBe(false);
  });
});

describe('resolveAllowedCorsOrigin', () => {
  it('allows missing origin and localhost', () => {
    const callback = vi.fn();

    resolveAllowedCorsOrigin(undefined, callback);
    resolveAllowedCorsOrigin('http://localhost:4300', callback);

    expect(callback).toHaveBeenNthCalledWith(1, null, true);
    expect(callback).toHaveBeenNthCalledWith(2, null, true);
  });

  it('denies disallowed hosts', () => {
    const callback = vi.fn();

    resolveAllowedCorsOrigin('https://evil.com', callback);

    expect(callback).toHaveBeenCalledWith(null, false);
  });
});
