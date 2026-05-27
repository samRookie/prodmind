import type { RetrievalQuery } from '../contracts/retrieval-query.ts';
import type { ContextWindow } from '../contracts/context-window.ts';

export interface RetrievalLimitsConfig {
  readonly maxRetrievalDepth: number;
  readonly maxContextSize: number;
  readonly maxGraphTraversal: number;
  readonly maxLineageExpansion: number;
  readonly maxResults: number;
  readonly maxNamespaces: number;
}

const DEFAULT_LIMITS: RetrievalLimitsConfig = Object.freeze({
  maxRetrievalDepth: 10,
  maxContextSize: 8192,
  maxGraphTraversal: 500,
  maxLineageExpansion: 50,
  maxResults: 100,
  maxNamespaces: 10,
});

export class RetrievalLimits {
  private _config: RetrievalLimitsConfig;

  constructor(config?: Partial<RetrievalLimitsConfig>) {
    this._config = { ...DEFAULT_LIMITS, ...config };
  }

  get config(): RetrievalLimitsConfig {
    return Object.freeze({ ...this._config });
  }

  update(config: Partial<RetrievalLimitsConfig>): void {
    this._config = { ...this._config, ...config };
  }

  enforceQueryLimits(query: RetrievalQuery): RetrievalQuery {
    return Object.freeze({
      ...query,
      maxDepth: Math.min(query.maxDepth, this._config.maxRetrievalDepth),
      maxResults: Math.min(query.maxResults, this._config.maxResults),
    });
  }

  enforceWindowLimits(window: ContextWindow): ContextWindow {
    if (window.totalTokens <= this._config.maxContextSize) return window;

    const entries = [...window.entries]
      .sort((a, b) => b.priority - a.priority);
    const kept: typeof entries = [];
    let running = 0;

    for (const entry of entries) {
      if (running + entry.tokenCount <= this._config.maxContextSize) {
        kept.push(entry);
        running += entry.tokenCount;
      }
    }

    return Object.freeze({
      ...window,
      entries: Object.freeze(kept),
      totalTokens: running,
      overflow: true,
    });
  }

  canTraverse(currentDepth: number, visitedCount: number): boolean {
    return currentDepth <= this._config.maxRetrievalDepth &&
           visitedCount <= this._config.maxGraphTraversal;
  }

  canExpandLineage(currentCount: number): boolean {
    return currentCount <= this._config.maxLineageExpansion;
  }

  validateQuery(query: RetrievalQuery): { valid: boolean; reasons: readonly string[] } {
    const reasons: string[] = [];

    if (query.maxDepth > this._config.maxRetrievalDepth) {
      reasons.push(`maxDepth ${query.maxDepth} exceeds limit ${this._config.maxRetrievalDepth}`);
    }
    if (query.maxResults > this._config.maxResults) {
      reasons.push(`maxResults ${query.maxResults} exceeds limit ${this._config.maxResults}`);
    }

    return Object.freeze({
      valid: reasons.length === 0,
      reasons: Object.freeze(reasons),
    });
  }

  reset(): void {
    this._config = { ...DEFAULT_LIMITS };
  }
}
