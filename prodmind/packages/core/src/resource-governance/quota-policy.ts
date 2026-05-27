interface QuotaConfig {
  maxGraphNodes: number;
  maxGraphEdges: number;
  maxPromptSizeBytes: number;
  maxProviderResponseBytes: number;
  maxReplayStorageBytes: number;
  maxConcurrentExecutions: number;
  maxSnapshots: number;
}

interface QuotaInfo {
  limit: number;
  used: number;
  remaining: number;
}

const DEFAULT_QUOTAS: QuotaConfig = {
  maxGraphNodes: 50000,
  maxGraphEdges: 200000,
  maxPromptSizeBytes: 128000,
  maxProviderResponseBytes: 512000,
  maxReplayStorageBytes: 1073741824,
  maxConcurrentExecutions: 10,
  maxSnapshots: 1000,
};

export class ResourceQuotaPolicy {
  private limits: Record<string, number>;
  private used: Record<string, number>;

  constructor(config?: Partial<QuotaConfig>) {
    const resolved: QuotaConfig = { ...DEFAULT_QUOTAS, ...config };
    this.limits = {
      graph_nodes: resolved.maxGraphNodes,
      graph_edges: resolved.maxGraphEdges,
      prompt_size: resolved.maxPromptSizeBytes,
      provider_response: resolved.maxProviderResponseBytes,
      replay_storage: resolved.maxReplayStorageBytes,
      concurrent_executions: resolved.maxConcurrentExecutions,
      snapshots: resolved.maxSnapshots,
    };
    this.used = {};
  }

  checkQuota(resourceType: string, requestedAmount: number): boolean {
    const limit = this.limits[resourceType];
    if (limit === undefined) return false;
    const currentUsed = this.used[resourceType] ?? 0;
    return currentUsed + requestedAmount <= limit;
  }

  getQuota(resourceType: string): Readonly<QuotaInfo> {
    const limit = this.limits[resourceType] ?? 0;
    const used = this.used[resourceType] ?? 0;
    return Object.freeze({
      limit,
      used,
      remaining: Math.max(0, limit - used),
    });
  }

  useQuota(resourceType: string, amount: number): boolean {
    const limit = this.limits[resourceType];
    if (limit === undefined) return false;
    const currentUsed = this.used[resourceType] ?? 0;
    if (currentUsed + amount > limit) return false;
    this.used[resourceType] = currentUsed + amount;
    return true;
  }

  releaseQuota(resourceType: string, amount: number): void {
    const currentUsed = this.used[resourceType] ?? 0;
    this.used[resourceType] = Math.max(0, currentUsed - amount);
  }

  getAllQuotas(): Readonly<Record<string, Readonly<QuotaInfo>>> {
    const result: Record<string, QuotaInfo> = {};
    for (const resourceType of Object.keys(this.limits)) {
      result[resourceType] = this.getQuota(resourceType) as QuotaInfo;
    }
    return Object.freeze(result);
  }

  reset(): void {
    this.used = {};
  }
}
