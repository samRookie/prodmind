import { createHash } from 'node:crypto';
import type { Env } from './env-schema.ts';
import { redactEnv } from './secrets-redaction.ts';

export class RuntimeEnvReport {
  generateSnapshot(env: Env): string {
    const redacted = redactEnv(env as unknown as Record<string, unknown>);
    const fp = createHash('sha256')
      .update(JSON.stringify(redacted, Object.keys(redacted).sort()))
      .digest('hex');
    return fp;
  }

  generateReport(env: Env): Record<string, unknown> {
    return {
      mode: env.NODE_ENV,
      port: env.PORT,
      host: env.HOST,
      aiProvider: env.AI_PROVIDER,
      dbPath: env.DB_PATH,
      replayEnabled: env.REPLAY_ENABLED,
      diagnosticsEnabled: env.DIAGNOSTICS_ENABLED,
      metricsEnabled: env.METRICS_ENABLED,
      memoryWarningMB: env.MEMORY_WARNING_MB,
      memoryCriticalMB: env.MEMORY_CRITICAL_MB,
      startupTimeoutMs: env.STARTUP_TIMEOUT_MS,
      shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
      logLevel: env.LOG_LEVEL,
      logFormat: env.LOG_FORMAT,
      releaseCommit: env.RELEASE_COMMIT,
      releaseVersion: env.RELEASE_VERSION,
      releaseTimestamp: env.RELEASE_TIMESTAMP,
      fingerprint: this.generateSnapshot(env),
    };
  }

  validateSnapshot(env: Env, expectedFingerprint: string): boolean {
    return this.generateSnapshot(env) === expectedFingerprint;
  }
}
