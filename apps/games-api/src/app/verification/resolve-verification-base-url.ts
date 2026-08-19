const LOCAL_VERIFICATION_TOOL_BASE_URL = 'http://localhost:4500';

export const resolveVerificationToolBaseUrl = (): string => {
  const trimmed = process.env.VERIFICATION_TOOL_BASE_URL?.trim();
  if (trimmed) {
    return trimmed;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'VERIFICATION_TOOL_BASE_URL is required when NODE_ENV is production',
    );
  }

  return LOCAL_VERIFICATION_TOOL_BASE_URL;
};
