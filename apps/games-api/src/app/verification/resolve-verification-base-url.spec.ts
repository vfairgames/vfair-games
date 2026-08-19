import { resolveVerificationToolBaseUrl } from './resolve-verification-base-url';

describe('resolveVerificationToolBaseUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to localhost:4500 in non-production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.VERIFICATION_TOOL_BASE_URL;

    expect(resolveVerificationToolBaseUrl()).toBe('http://localhost:4500');
  });

  it('requires VERIFICATION_TOOL_BASE_URL in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.VERIFICATION_TOOL_BASE_URL;

    expect(() => resolveVerificationToolBaseUrl()).toThrow(
      'VERIFICATION_TOOL_BASE_URL is required when NODE_ENV is production',
    );
  });

  it('reads VERIFICATION_TOOL_BASE_URL when set', () => {
    process.env.NODE_ENV = 'production';
    process.env.VERIFICATION_TOOL_BASE_URL = 'https://verify.example.com';

    expect(resolveVerificationToolBaseUrl()).toBe('https://verify.example.com');
  });
});
