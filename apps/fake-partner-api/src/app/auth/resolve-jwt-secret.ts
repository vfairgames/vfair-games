export const resolveJwtSecret = (): string => {
  const secret = process.env['JWT_SECRET'];
  if (secret) {
    return secret;
  }

  if (process.env['NODE_ENV'] === 'production') {
    throw new Error('JWT_SECRET is required when NODE_ENV is production');
  }

  return 'dev-partner-jwt-secret';
};
