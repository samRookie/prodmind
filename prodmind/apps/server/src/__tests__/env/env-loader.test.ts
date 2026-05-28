import { describe, it, expect, vi } from 'vitest';
import { EnvLoader } from '../../env/env-loader.ts';

describe('EnvLoader', () => {
  it('loads with defaults for empty env', () => {
    vi.stubEnv('NODE_ENV', '');
    const loader = new EnvLoader();
    const env = loader.load();
    expect(env).toBeTruthy();
    expect(env.NODE_ENV).toBe('development');
    vi.unstubAllEnvs();
  });

  it('returns same env on repeated get', () => {
    vi.stubEnv('NODE_ENV', '');
    const loader = new EnvLoader();
    loader.load();
    const env = loader.env;
    expect(env.NODE_ENV).toBe('development');
    vi.unstubAllEnvs();
  });

  it('throws if accessed before load', () => {
    const loader = new EnvLoader();
    expect(() => loader.env).toThrow();
  });
});
