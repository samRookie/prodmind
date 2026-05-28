import type { Env } from '../env/env-schema.ts';

export interface DeploymentValidationResult {
  valid: boolean;
  checks: { name: string; passed: boolean; message: string }[];
  failed: { name: string; message: string }[];
}

export class DeploymentValidator {
  validate(env: Env): DeploymentValidationResult {
    const checks: DeploymentValidationResult['checks'] = [];

    checks.push({ name: 'node-version', passed: /^v(2[0-9]|[3-9]\d)\./.test(process.version), message: `Node.js version ${process.version}` });
    checks.push({ name: 'port-available', passed: env.PORT > 0 && env.PORT <= 65535, message: `Port ${env.PORT}` });
    checks.push({ name: 'db-path', passed: typeof env.DB_PATH === 'string' && env.DB_PATH.length > 0, message: `DB path: ${env.DB_PATH}` });
    checks.push({ name: 'ai-provider', passed: ['anthropic', 'openai', 'gemini', 'mock'].includes(env.AI_PROVIDER), message: `AI provider: ${env.AI_PROVIDER}` });

    if (env.NODE_ENV === 'production') {
      checks.push({ name: 'ai-api-key', passed: env.AI_PROVIDER === 'mock' || !!env.AI_API_KEY, message: env.AI_API_KEY ? 'AI key configured' : 'No AI key' });
      checks.push({ name: 'release-info', passed: !!(env.RELEASE_COMMIT && env.RELEASE_VERSION), message: `Release: ${env.RELEASE_VERSION ?? 'unknown'}@${(env.RELEASE_COMMIT ?? 'unknown').slice(0, 8)}` });
      checks.push({ name: 'not-wildcard-cors', passed: env.CORS_ORIGINS !== '*', message: `CORS: ${env.CORS_ORIGINS}` });
    }

    const failed = checks.filter(c => !c.passed).map(c => ({ name: c.name, message: c.message }));
    return { valid: failed.length === 0, checks, failed };
  }
}
