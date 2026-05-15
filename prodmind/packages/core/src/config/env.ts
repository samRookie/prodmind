import { z } from 'zod';

export const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  DATABASE_URL: z.string().default('file:./prodmind.db'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(overrides?: Record<string, string>): Env {
  if (cachedEnv && !overrides) {
    return cachedEnv;
  }

  const source = overrides ?? process.env;
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
