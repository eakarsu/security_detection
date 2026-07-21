export function requiredEnv(name: string, minimumLength = 1): string {
  const value = process.env[name]?.trim();
  if (!value || value.length < minimumLength) {
    throw new Error(
      `${name} must be set${minimumLength > 1 ? ` and contain at least ${minimumLength} characters` : ''}`,
    );
  }
  return value;
}

export function jwtSecret(): string {
  return requiredEnv('JWT_SECRET', 32);
}
