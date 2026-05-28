import { envSchema, type Env } from './env-schema.ts';
import { isSensitiveKey, redactValue } from './secrets-redaction.ts';

export class EnvLoader {
  private _env: Env | null = null;
  private _warnings: string[] = [];
  private _errors: string[] = [];

  load(): Env {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      this._errors = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
      this._env = envSchema.parse({});
      return this._env;
    }
    this._env = parsed.data;

    for (const key of Object.keys(process.env)) {
      if (isSensitiveKey(key) && process.env[key]) {
        const value = process.env[key];
        if (typeof value === 'string' && value.length > 0) {
          this._warnings.push(`${key}: ${redactValue(value)}`);
        }
      }
    }

    return this._env;
  }

  get env(): Env {
    if (!this._env) throw new Error('Environment not loaded. Call load() first.');
    return this._env;
  }

  get warnings(): readonly string[] { return this._warnings; }
  get errors(): readonly string[] { return this._errors; }

  reload(): Env {
    this._env = null;
    this._warnings = [];
    this._errors = [];
    return this.load();
  }
}
