import { getEnv } from './env.ts';

export const RuntimeEnvironment = {
  Development: 'development',
  Test: 'test',
  Ci: 'ci',
  Production: 'production',
  Mock: 'mock',
} as const;

export type RuntimeEnvironment = (typeof RuntimeEnvironment)[keyof typeof RuntimeEnvironment];

export function detectEnvironment(): RuntimeEnvironment {
  const env = getEnv();

  if (env.MOCK_MODE) return RuntimeEnvironment.Mock;
  if (env.CI) return RuntimeEnvironment.Ci;
  return env.NODE_ENV as RuntimeEnvironment;
}

export function isDevelopment(): boolean {
  return detectEnvironment() === RuntimeEnvironment.Development;
}

export function isTest(): boolean {
  return detectEnvironment() === RuntimeEnvironment.Test;
}

export function isCi(): boolean {
  return detectEnvironment() === RuntimeEnvironment.Ci;
}

export function isProduction(): boolean {
  return detectEnvironment() === RuntimeEnvironment.Production;
}

export function isMock(): boolean {
  return detectEnvironment() === RuntimeEnvironment.Mock;
}

export function assertEnvironment(expected: RuntimeEnvironment): void {
  const actual = detectEnvironment();
  if (actual !== expected) {
    throw new Error(
      `Environment mismatch: expected '${expected}' but got '${actual}'`,
    );
  }
}
