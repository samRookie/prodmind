import type { ProviderSelectionResult } from '../contracts.ts';
import { createProviderSelectionResult } from '../contracts.ts';

export interface SelectionCriteria {
  readonly preferredProvider?: string;
  readonly preferredModel?: string;
  readonly minTokens?: number;
  readonly maxCost?: number;
  readonly requireDeterministic?: boolean;
  readonly categories?: readonly string[];
}

export interface ProviderCapability {
  readonly provider: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly maxContextTokens: number;
  readonly costPer1K: number;
  readonly deterministic: boolean;
  readonly categories: readonly string[];
  readonly priority: number;
}

export type SelectionStrategy = 'first-available' | 'cheapest' | 'deterministic' | 'preferred';

export class ProviderSelector {
  private readonly capabilities: readonly ProviderCapability[];

  constructor(capabilities?: ProviderCapability[]) {
    const items = capabilities ?? getDefaultCapabilities();
    this.capabilities = items as readonly ProviderCapability[];
  }

  select(criteria: SelectionCriteria, strategy?: SelectionStrategy): ProviderSelectionResult {
    const activeStrategy = strategy ?? 'first-available';
    const candidates = this.filterCandidates(criteria);

    if (candidates.length === 0) {
      return createProviderSelectionResult({
        provider: 'none',
        model: 'none',
        reason: 'No provider matches criteria',
      });
    }

    switch (activeStrategy) {
      case 'preferred':
        return this.selectPreferred(candidates, criteria);
      case 'cheapest':
        return this.selectCheapest(candidates);
      case 'deterministic':
        return this.selectDeterministic(candidates);
      case 'first-available':
      default:
        return this.selectFirst(candidates);
    }
  }

  getCapabilities(): readonly ProviderCapability[] {
    return this.capabilities as readonly ProviderCapability[];
  }

  private filterCandidates(criteria: SelectionCriteria): ProviderCapability[] {
    return this.capabilities.filter(cap => {
      if (criteria.preferredProvider && cap.provider !== criteria.preferredProvider) return false;
      if (criteria.preferredModel && cap.model !== criteria.preferredModel) return false;
      if (criteria.minTokens && cap.maxTokens < criteria.minTokens) return false;
      if (criteria.requireDeterministic && !cap.deterministic) return false;
      if (criteria.maxCost !== undefined && cap.costPer1K > criteria.maxCost) return false;
      if (criteria.categories && criteria.categories.length > 0) {
        const hasCategory = criteria.categories.some(c => cap.categories.includes(c));
        if (!hasCategory) return false;
      }
      return true;
    });
  }

  private selectFirst(candidates: ProviderCapability[]): ProviderSelectionResult {
    const best = candidates.reduce((a, b) => (a.priority < b.priority ? a : b));
    return createProviderSelectionResult({
      provider: best.provider,
      model: best.model,
      reason: `First available: ${best.provider}/${best.model} (priority ${best.priority})`,
    });
  }

  private selectCheapest(candidates: ProviderCapability[]): ProviderSelectionResult {
    const best = candidates.reduce((a, b) => (a.costPer1K < b.costPer1K ? a : b));
    return createProviderSelectionResult({
      provider: best.provider,
      model: best.model,
      reason: `Cheapest: ${best.provider}/${best.model} ($${best.costPer1K}/1K tokens)`,
    });
  }

  private selectDeterministic(candidates: ProviderCapability[]): ProviderSelectionResult {
    const det = candidates.filter(c => c.deterministic);
    const best = det.length > 0
      ? det.reduce((a, b) => (a.priority < b.priority ? a : b))
      : candidates.reduce((a, b) => (a.priority < b.priority ? a : b));
    return createProviderSelectionResult({
      provider: best.provider,
      model: best.model,
      reason: det.length > 0
        ? `Deterministic: ${best.provider}/${best.model}`
        : `No deterministic provider, fallback: ${best.provider}/${best.model}`,
    });
  }

  private selectPreferred(candidates: ProviderCapability[], criteria: SelectionCriteria): ProviderSelectionResult {
    if (criteria.preferredProvider) {
      const exact = candidates.find(
        c => c.provider === criteria.preferredProvider && (!criteria.preferredModel || c.model === criteria.preferredModel),
      );
      if (exact) {
        return createProviderSelectionResult({
          provider: exact.provider,
          model: exact.model,
          reason: `Preferred: ${exact.provider}/${exact.model}`,
        });
      }
    }
    return this.selectFirst(candidates);
  }
}

function getDefaultCapabilities(): ProviderCapability[] {
  return [
    Object.freeze({ provider: 'openai', model: 'gpt-4o', maxTokens: 4096, maxContextTokens: 128000, costPer1K: 0.01, deterministic: false, categories: ['general', 'chat', 'code'], priority: 1 }),
    Object.freeze({ provider: 'openai', model: 'gpt-4o-mini', maxTokens: 4096, maxContextTokens: 128000, costPer1K: 0.002, deterministic: false, categories: ['general', 'chat', 'code'], priority: 2 }),
    Object.freeze({ provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct:free', maxTokens: 4096, maxContextTokens: 32768, costPer1K: 0, deterministic: false, categories: ['general', 'chat'], priority: 3 }),
    Object.freeze({ provider: 'groq', model: 'mixtral-8x7b-32768', maxTokens: 4096, maxContextTokens: 32768, costPer1K: 0, deterministic: false, categories: ['general', 'chat', 'code'], priority: 4 }),
    Object.freeze({ provider: 'anthropic', model: 'claude-3-5-sonnet-latest', maxTokens: 4096, maxContextTokens: 200000, costPer1K: 0.03, deterministic: false, categories: ['general', 'chat', 'code', 'analysis'], priority: 5 }),
    Object.freeze({ provider: 'gemini', model: 'gemini-2.0-flash', maxTokens: 8192, maxContextTokens: 1048576, costPer1K: 0, deterministic: false, categories: ['general', 'chat', 'vision'], priority: 6 }),
    Object.freeze({ provider: 'local', model: 'qwen2.5:7b', maxTokens: 4096, maxContextTokens: 32768, costPer1K: 0, deterministic: true, categories: ['general', 'chat', 'code'], priority: 7 }),
  ];
}
