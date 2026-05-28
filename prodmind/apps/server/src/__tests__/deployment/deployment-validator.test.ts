import { describe, it, expect } from 'vitest';
import { DeploymentValidator } from '../../deployment/deployment-validator.ts';
import { envSchema } from '../../env/env-schema.ts';

describe('DeploymentValidator', () => {
  it('validates development deployment', () => {
    const v = new DeploymentValidator();
    const env = envSchema.parse({});
    const result = v.validate(env);
    expect(result.valid).toBe(true);
  });

  it('fails on invalid port', () => {
    expect(() => envSchema.parse({ PORT: 0 })).toThrow();
  });

  it('validates production deployment', () => {
    const v = new DeploymentValidator();
    const env = envSchema.parse({ NODE_ENV: 'production', AI_API_KEY: 'sk-test', RELEASE_COMMIT: 'abc', RELEASE_VERSION: '1.0', CORS_ORIGINS: 'http://localhost' });
    const result = v.validate(env);
    expect(result.valid).toBe(true);
  });

  it('fails production without release info', () => {
    const v = new DeploymentValidator();
    const env = envSchema.parse({ NODE_ENV: 'production' });
    const result = v.validate(env);
    expect(result.valid).toBe(false);
  });
});
