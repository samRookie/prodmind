import { z } from 'zod';
import type { TokenUsage } from '../contracts/request.ts';
import type { RetryPolicy } from '../retries/retry-policy.ts';

export const retryPolicySchema = z.object({
  maxRetries: z.number().int().min(0).default(3),
  baseDelayMs: z.number().int().min(0).default(1000),
  maxDelayMs: z.number().int().min(0).default(30000),
  backoffFactor: z.number().min(1).default(2),
  retryableStatusCodes: z.array(z.number().int()).default([408, 429, 500, 502, 503, 504]),
});

export const providerConfigSchema = z.object({
  openai: z.object({
    enabled: z.boolean().default(false),
    model: z.string().default('gpt-4o'),
    timeoutMs: z.number().int().positive().default(30000),
    maxRetries: z.number().int().min(0).default(3),
    maxTokens: z.number().int().positive().default(4096),
    contextWindow: z.number().int().positive().default(128000),
    baseUrl: z.string().default('https://api.openai.com/v1'),
  }).default({}),
  anthropic: z.object({
    enabled: z.boolean().default(false),
    model: z.string().default('claude-3-5-sonnet'),
    timeoutMs: z.number().int().positive().default(60000),
    maxRetries: z.number().int().min(0).default(3),
    maxTokens: z.number().int().positive().default(4096),
    contextWindow: z.number().int().positive().default(200000),
    baseUrl: z.string().default('https://api.anthropic.com/v1'),
  }).default({}),
  gemini: z.object({
    enabled: z.boolean().default(true),
    model: z.string().default('gemini-2.0-flash'),
    timeoutMs: z.number().int().positive().default(60000),
    maxRetries: z.number().int().min(0).default(3),
    maxTokens: z.number().int().positive().default(8192),
    contextWindow: z.number().int().positive().default(1048576),
    baseUrl: z.string().default('https://generativelanguage.googleapis.com/v1'),
  }).default({}),
  mock: z.object({
    enabled: z.boolean().default(true),
    seed: z.number().int().default(42),
    delayMs: z.number().int().min(0).default(0),
    simulatedTokenUsage: z.object({
      promptTokens: z.number().int().positive().default(50),
      completionTokens: z.number().int().positive().default(100),
      totalTokens: z.number().int().positive().default(150),
    }).default({}),
    failureRate: z.number().min(0).max(1).default(0),
    consecutiveFailures: z.number().int().min(0).default(0),
    timeoutMs: z.number().int().positive().default(5000),
    maxRetries: z.number().int().min(0).default(0),
  }).default({}),
});

export type ProviderConfigSchema = z.infer<typeof providerConfigSchema>;

export interface ProviderConfig {
  readonly apiKey?: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly retryPolicy: RetryPolicy;
  readonly baseUrl?: string;
}

export interface OpenAIConfig extends ProviderConfig {
  readonly organizationId?: string;
}

export type AnthropicConfig = ProviderConfig;

export type GeminiConfig = ProviderConfig;

export interface MockProviderConfig extends ProviderConfig {
  readonly seed: number;
  readonly delayMs: number;
  readonly simulatedTokenUsage: TokenUsage;
  readonly failureRate: number;
  readonly consecutiveFailures: number;
}

export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'mock';

export function createProviderConfig(type: ProviderType, overrides: Partial<ProviderConfig> & { model: string }): ProviderConfig {
  const defaults: Record<ProviderType, Omit<ProviderConfig, 'model'>> = {
    openai: {
      timeoutMs: 30000,
      retryPolicy: { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30000, backoffFactor: 2, retryableStatusCodes: [408, 429, 500, 502, 503, 504] },
      baseUrl: 'https://api.openai.com/v1',
    },
    anthropic: {
      timeoutMs: 60000,
      retryPolicy: { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30000, backoffFactor: 2, retryableStatusCodes: [408, 429, 500, 502, 503, 504] },
      baseUrl: 'https://api.anthropic.com/v1',
    },
    gemini: {
      timeoutMs: 60000,
      retryPolicy: { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 30000, backoffFactor: 2, retryableStatusCodes: [429, 500, 502, 503, 504] },
      baseUrl: 'https://generativelanguage.googleapis.com/v1',
    },
    mock: {
      timeoutMs: 5000,
      retryPolicy: { maxRetries: 0, baseDelayMs: 0, maxDelayMs: 0, backoffFactor: 1, retryableStatusCodes: [] },
      baseUrl: undefined,
    },
  };

  const defaultConfig = defaults[type];

  return {
    ...defaultConfig,
    ...overrides,
    retryPolicy: overrides.retryPolicy ?? defaultConfig.retryPolicy,
    model: overrides.model,
  };
}
