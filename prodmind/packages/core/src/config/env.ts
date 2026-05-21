import { existsSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { z } from 'zod';

function loadDotenv(path?: string): Record<string, string> {
  const envPath = path ?? resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return {};

  const content = readFileSync(envPath, 'utf-8');
  const vars: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) vars[key] = value;
  }

  return vars;
}

function coerceBoolean(v: unknown): boolean {
  return v === 'true' || v === '1' || v === true;
}

export const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  DATABASE_URL: z.string().default('file:./prodmind.db'),
  NODE_ENV: z.enum(['development', 'production', 'test', 'ci']).default('development'),
  CI: z.preprocess(coerceBoolean, z.boolean()).default(false),
  MOCK_MODE: z.preprocess(coerceBoolean, z.boolean()).default(false),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGINS: z.string().optional(),
  DEBUG: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(overrides?: Record<string, string>): Env {
  if (cachedEnv && !overrides) {
    return cachedEnv;
  }

  const dotenvVars = loadDotenv();
  const source = { ...dotenvVars, ...(overrides ?? process.env) };
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');

    throw new Error(
      `Environment validation failed:\n${issues}\n\n` +
        'Ensure all required environment variables are set. ' +
        'See .env.example for reference.',
    );
  }

  if (!overrides) {
    cachedEnv = result.data;
  }

  return result.data;
}

export function getEnv(): Env {
  if (!cachedEnv) {
    return loadEnv();
  }
  return cachedEnv;
}

export function resetEnv(): void {
  cachedEnv = null;
}
