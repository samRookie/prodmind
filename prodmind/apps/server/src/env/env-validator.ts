import type { Env } from './env-schema.ts';

export interface EnvValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  mode: string;
}

export class EnvValidator {
  validate(env: Env): EnvValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (env.NODE_ENV === 'production') {
      if (!env.AI_API_KEY && env.AI_PROVIDER !== 'mock') {
        errors.push('AI_API_KEY is required in production mode');
      }
      if (env.LOG_LEVEL === 'debug') {
        warnings.push('LOG_LEVEL debug in production may expose sensitive data');
      }
      if (env.CORS_ORIGINS === '*') {
        warnings.push('CORS_ORIGINS set to wildcard in production');
      }
      if (env.RELEASE_COMMIT === undefined || env.RELEASE_COMMIT === '') {
        warnings.push('RELEASE_COMMIT not set in production');
      }
    }

    if (env.DB_PATH === './prodmind.db' && env.NODE_ENV === 'production') {
      warnings.push('Using default DB_PATH in production');
    }

    if (env.AI_PROVIDER !== 'mock' && !env.AI_API_KEY) {
      warnings.push(`AI_PROVIDER is ${env.AI_PROVIDER} but no AI_API_KEY set`);
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
      mode: env.NODE_ENV,
    };
  }

  validateMode(env: Env, allowedModes: readonly string[]): boolean {
    return allowedModes.includes(env.NODE_ENV);
  }

  isProduction(env: Env): boolean {
    return env.NODE_ENV === 'production';
  }

  isDevelopment(env: Env): boolean {
    return env.NODE_ENV === 'development';
  }

  isTest(env: Env): boolean {
    return env.NODE_ENV === 'test';
  }

  isCi(env: Env): boolean {
    return env.NODE_ENV === 'ci';
  }
}
