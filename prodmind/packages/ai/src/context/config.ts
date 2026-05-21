import { z } from 'zod';
import { featureFlags, getLimits, type FeatureFlagKey } from '@prodmind/core';

export const contextWeightsSchema = z.object({
  centrality: z.number().min(0).max(1).default(0.25),
  proximity: z.number().min(0).max(1).default(0.25),
  semantic: z.number().min(0).max(1).default(0.25),
  risk: z.number().min(0).max(1).default(0.25),
}).refine(
  (w) => Math.abs(w.centrality + w.proximity + w.semantic + w.risk - 1) < 0.001,
  { message: 'Weights must sum to 1' },
);

export type ContextWeights = z.infer<typeof contextWeightsSchema>;

export const tokenBudgetSchema = z.object({
  hardLimit: z.number().int().positive().default(16000),
  softLimit: z.number().int().positive().default(12000),
  reservedPerRegion: z.number().int().positive().default(1000),
});

export type TokenBudget = z.infer<typeof tokenBudgetSchema>;

export const contextConfigSchema = z.object({
  weights: contextWeightsSchema.default({}),
  budget: tokenBudgetSchema.default({}),
  maxCandidates: z.number().int().positive().default(200),
  maxChains: z.number().int().positive().default(20),
  maxRegions: z.number().int().positive().default(10),
  maxDepth: z.number().int().positive().default(10),
  maxSlices: z.number().int().positive().default(5),
  compressionThreshold: z.number().min(0).max(1).default(0.7),
  dedupBatchSize: z.number().int().positive().default(100),
  rankingTopK: z.number().int().positive().default(50),
  defaultStrategy: z.string().default('DEPENDENCY_NEIGHBORHOOD'),
  compressionPreference: z.enum(['prefer_raw', 'prefer_compressed', 'hybrid', 'adaptive']).default('adaptive'),
  enableTracing: z.boolean().default(true),
  enableReplayValidation: z.boolean().default(false),
});

export type ContextConfig = z.infer<typeof contextConfigSchema>;

let cachedConfig: ContextConfig | null = null;

const defaultConfig: ContextConfig = {
  weights: { centrality: 0.25, proximity: 0.25, semantic: 0.25, risk: 0.25 },
  budget: { hardLimit: 16000, softLimit: 12000, reservedPerRegion: 1000 },
  maxCandidates: 200,
  maxChains: 20,
  maxRegions: 10,
  maxDepth: 10,
  maxSlices: 5,
  compressionThreshold: 0.7,
  dedupBatchSize: 100,
  rankingTopK: 50,
  defaultStrategy: 'DEPENDENCY_NEIGHBORHOOD',
  compressionPreference: 'adaptive',
  enableTracing: true,
  enableReplayValidation: false,
};

export function resolveContextConfig(overrides?: Partial<ContextConfig>): ContextConfig {
  if (cachedConfig && !overrides) {
    return cachedConfig;
  }

  const isContextEnabled = featureFlags.isEnabled('ENABLE_CONTEXT_ASSEMBLY' as FeatureFlagKey);
  const isContextReplaySafe = featureFlags.isEnabled('ENABLE_CONTEXT_ASSEMBLY_REPLAY_SAFE' as FeatureFlagKey);

  if (isContextReplaySafe && !isContextEnabled) {
    return defaultConfig;
  }

  const merged = { ...defaultConfig, ...overrides };
  const parsed = contextConfigSchema.parse(merged) as ContextConfig;

  const limits = getLimits();
  const effectiveMaxCandidates = Math.min(parsed.maxCandidates, limits.graph.maxVisitedNodes);
  const effectiveMaxDepth = Math.min(parsed.maxDepth, limits.graph.maxRetrievalDepth);

  const result: ContextConfig = {
    ...parsed,
    maxCandidates: effectiveMaxCandidates,
    maxDepth: effectiveMaxDepth,
  };

  if (!overrides) {
    cachedConfig = result;
  }

  return result;
}

export function resetContextConfig(): void {
  cachedConfig = null;
}
