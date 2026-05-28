import { z } from 'zod';

export const DeploymentMode = z.enum(['development', 'production', 'test', 'ci']);
export type DeploymentMode = z.infer<typeof DeploymentMode>;

export const envSchema = z.object({
  NODE_ENV: DeploymentMode.default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  DB_PATH: z.string().default('./prodmind.db'),
  DB_MAX_CONNECTIONS: z.coerce.number().int().positive().default(10),

  AI_PROVIDER: z.enum(['anthropic', 'openai', 'gemini', 'mock']).default('mock'),
  AI_API_KEY: z.string().optional(),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(4096),

  STORAGE_PATH: z.string().default('./storage'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().positive().default(50),
  MAX_GRAPH_NODES: z.coerce.number().int().positive().default(100_000),
  MAX_GRAPH_EDGES: z.coerce.number().int().positive().default(500_000),

  REPLAY_ENABLED: z.coerce.boolean().default(true),
  REPLAY_STORAGE_PATH: z.string().optional(),
  REPLAY_MAX_SNAPSHOTS: z.coerce.number().int().positive().default(100),

  CORS_ORIGINS: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  HEALTH_CHECK_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
  METRICS_ENABLED: z.coerce.boolean().default(false),
  DIAGNOSTICS_ENABLED: z.coerce.boolean().default(false),

  STARTUP_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  MEMORY_WARNING_MB: z.coerce.number().positive().default(512),
  MEMORY_CRITICAL_MB: z.coerce.number().positive().default(1024),

  RELEASE_COMMIT: z.string().optional(),
  RELEASE_VERSION: z.string().optional(),
  RELEASE_TIMESTAMP: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const envDocumentation: Record<string, string> = {
  NODE_ENV: 'Deployment environment mode',
  PORT: 'HTTP server port',
  HOST: 'HTTP server host',
  LOG_LEVEL: 'Logging verbosity level',
  LOG_FORMAT: 'Log output format',
  DB_PATH: 'Path to SQLite database file',
  DB_MAX_CONNECTIONS: 'Maximum database connections',
  AI_PROVIDER: 'AI provider to use',
  AI_API_KEY: 'API key for AI provider',
  AI_MAX_RETRIES: 'Maximum AI provider retries',
  AI_TIMEOUT_MS: 'AI request timeout in milliseconds',
  AI_MAX_TOKENS: 'Maximum tokens for AI response',
  STORAGE_PATH: 'File storage path',
  MAX_UPLOAD_SIZE_MB: 'Maximum upload size in MB',
  MAX_GRAPH_NODES: 'Maximum graph nodes before warning',
  MAX_GRAPH_EDGES: 'Maximum graph edges before warning',
  REPLAY_ENABLED: 'Enable replay determinism system',
  REPLAY_STORAGE_PATH: 'Replay snapshot storage path',
  REPLAY_MAX_SNAPSHOTS: 'Maximum replay snapshots to retain',
  CORS_ORIGINS: 'Allowed CORS origins',
  RATE_LIMIT_WINDOW_MS: 'Rate limit window in milliseconds',
  RATE_LIMIT_MAX: 'Maximum requests per rate limit window',
  HEALTH_CHECK_INTERVAL_MS: 'Health check polling interval',
  METRICS_ENABLED: 'Enable metrics collection',
  DIAGNOSTICS_ENABLED: 'Enable runtime diagnostics',
  STARTUP_TIMEOUT_MS: 'Maximum startup time',
  SHUTDOWN_TIMEOUT_MS: 'Maximum shutdown time',
  MEMORY_WARNING_MB: 'Memory warning threshold',
  MEMORY_CRITICAL_MB: 'Memory critical threshold',
  RELEASE_COMMIT: 'Git commit hash for release',
  RELEASE_VERSION: 'Semantic version for release',
  RELEASE_TIMESTAMP: 'ISO timestamp for release',
};
