import { z } from 'zod';

export const providerTimeoutPolicySchema = z.object({
  connectMs: z.number().int().positive().default(10000),
  readMs: z.number().int().positive().default(30000),
  writeMs: z.number().int().positive().default(10000),
  totalMs: z.number().int().positive().default(60000),
});

export const providerLimitsSchema = z.object({
  maxTokensPerMin: z.number().int().positive().default(100000),
  maxRequestsPerMin: z.number().int().positive().default(1000),
  maxConcurrency: z.number().int().positive().default(10),
  maxRetries: z.number().int().min(0).default(3),
});

export const providerGovernanceProfileSchema = z.object({
  maxTokens: z.number().int().positive().default(4096),
  maxContextTokens: z.number().int().positive().default(128000),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).default(1),
  deterministic: z.boolean().default(false),
  allowedCategories: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
});

export const providerHealthConfigSchema = z.object({
  enabled: z.boolean().default(true),
  failureThreshold: z.number().int().positive().default(5),
  recoveryThreshold: z.number().int().positive().default(3),
  checkIntervalMs: z.number().int().positive().default(60000),
});

export const providerRateLimitConfigSchema = z.object({
  enabled: z.boolean().default(true),
  tokensPerMin: z.number().int().positive().default(100000),
  requestsPerMin: z.number().int().positive().default(1000),
  maxConcurrency: z.number().int().positive().default(10),
});

export const providerSpecificConfigSchema = z.object({
  model: z.string(),
  baseUrl: z.string().optional(),
  apiKeyEnv: z.string().optional(),
  timeout: providerTimeoutPolicySchema.default({}),
  limits: providerLimitsSchema.default({}),
  governance: providerGovernanceProfileSchema.default({}),
  health: providerHealthConfigSchema.default({}),
  rateLimit: providerRateLimitConfigSchema.default({}),
});

export const providerConfigSchema = z.object({
  openai: providerSpecificConfigSchema.default({
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
  }),
  openrouter: providerSpecificConfigSchema.default({
    model: 'meta-llama/llama-3.1-8b-instruct:free',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
  }),
  groq: providerSpecificConfigSchema.default({
    model: 'mixtral-8x7b-32768',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
  }),
  anthropic: providerSpecificConfigSchema.default({
    model: 'claude-3-5-sonnet-latest',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    governance: { maxContextTokens: 200000 },
  }),
  gemini: providerSpecificConfigSchema.default({
    model: 'gemini-2.0-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    apiKeyEnv: 'GEMINI_API_KEY',
    governance: { maxContextTokens: 1048576, maxTokens: 8192 },
  }),
  local: providerSpecificConfigSchema.default({
    model: 'qwen2.5:7b',
    baseUrl: 'http://localhost:11434/v1',
    apiKeyEnv: undefined,
    governance: { enabled: true, deterministic: true, maxContextTokens: 32768 },
  }),
});

export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type ProviderSpecificConfig = z.infer<typeof providerSpecificConfigSchema>;
export type ProviderTimeoutPolicyConfig = z.infer<typeof providerTimeoutPolicySchema>;
export type ProviderGovernanceProfile = z.infer<typeof providerGovernanceProfileSchema>;
export type ProviderRateLimitConfig = z.infer<typeof providerRateLimitConfigSchema>;
export type ProviderHealthConfig = z.infer<typeof providerHealthConfigSchema>;

export function createProviderConfig(overrides?: Partial<z.input<typeof providerConfigSchema>>): ProviderConfig {
  return providerConfigSchema.parse(overrides ?? {});
}
