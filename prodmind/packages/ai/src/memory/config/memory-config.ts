export interface MemoryConfig {
  readonly maxMemoryEntries: number;
  readonly maxSnapshotHistory: number;
  readonly maxRetrievalDepth: number;
  readonly maxRetrievalResults: number;
  readonly defaultContextBudget: number;
  readonly maxReasoningChainLength: number;
  readonly compressionEnabled: boolean;
  readonly telemetryEnabled: boolean;
  readonly fingerprintAlgorithm: string;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = Object.freeze({
  maxMemoryEntries: 10000,
  maxSnapshotHistory: 100,
  maxRetrievalDepth: 5,
  maxRetrievalResults: 100,
  defaultContextBudget: 8192,
  maxReasoningChainLength: 50,
  compressionEnabled: true,
  telemetryEnabled: true,
  fingerprintAlgorithm: 'sha256',
});

export class MemoryConfigManager {
  private _config: MemoryConfig;

  constructor(config?: Partial<MemoryConfig>) {
    this._config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  get config(): MemoryConfig {
    return Object.freeze({ ...this._config });
  }

  update(config: Partial<MemoryConfig>): void {
    this._config = { ...this._config, ...config };
  }

  reset(): void {
    this._config = { ...DEFAULT_MEMORY_CONFIG };
  }
}
