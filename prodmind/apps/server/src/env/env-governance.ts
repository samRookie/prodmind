import { EnvLoader } from './env-loader.ts';
import { EnvValidator } from './env-validator.ts';
import type { Env } from './env-schema.ts';
import { redactEnv } from './secrets-redaction.ts';

export interface EnvGovernanceReport {
  loaded: boolean;
  valid: boolean;
  mode: string;
  warnings: string[];
  errors: string[];
  secretsLoaded: number;
  snapshot: Record<string, unknown>;
}

export class EnvGovernance {
  private readonly loader = new EnvLoader();
  private readonly validator = new EnvValidator();
  private _report: EnvGovernanceReport | null = null;

  initialize(): Env {
    const env = this.loader.load();
    const validation = this.validator.validate(env);

    const secretKeys = Object.keys(process.env).filter(k => /api_key|secret|token|password/i.test(k));

    this._report = {
      loaded: true,
      valid: validation.valid,
      mode: env.NODE_ENV,
      warnings: [...this.loader.warnings, ...validation.warnings],
      errors: validation.errors,
      secretsLoaded: secretKeys.length,
      snapshot: redactEnv(env as unknown as Record<string, unknown>),
    };

    return env;
  }

  get report(): EnvGovernanceReport {
    if (!this._report) throw new Error('Environment governance not initialized');
    return this._report;
  }

  validate(): boolean {
    if (!this._report) return false;
    return this._report.valid;
  }
}
