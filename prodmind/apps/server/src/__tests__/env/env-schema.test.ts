import { describe, it, expect } from 'vitest';
import { envSchema } from '../../env/env-schema.ts';

describe('envSchema', () => {
  it('parses with defaults for empty input', () => {
    const env = envSchema.parse({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.AI_PROVIDER).toBe('mock');
  });

  it('accepts valid production input', () => {
    const env = envSchema.parse({ NODE_ENV: 'production', AI_API_KEY: 'sk-test', PORT: '8080' });
    expect(env.NODE_ENV).toBe('production');
    expect(env.PORT).toBe(8080);
    expect(env.AI_API_KEY).toBe('sk-test');
  });

  it('coerces boolean values', () => {
    const env = envSchema.parse({ REPLAY_ENABLED: 'true' });
    expect(env.REPLAY_ENABLED).toBe(true);
  });

  it('rejects invalid port', () => {
    expect(() => envSchema.parse({ PORT: '99999' })).toThrow();
  });

  it('rejects invalid NODE_ENV', () => {
    expect(() => envSchema.parse({ NODE_ENV: 'invalid' })).toThrow();
  });
});
