import type { MemoryRecordCategory } from './memory-record.ts';

export interface MemoryEntry {
  readonly id: string;
  readonly category: MemoryRecordCategory;
  readonly timestamp: string;
  readonly content: string;
  readonly fingerprint: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly tags: readonly string[];
  readonly provenanceId: string;
  readonly parentId: string;
}

export interface ArchitecturalFinding {
  readonly id: string;
  readonly findingType: string;
  readonly label: string;
  readonly description: string;
  readonly severity: string;
  readonly affectedNodeIds: readonly string[];
  readonly dependencies: readonly string[];
  readonly timestamp: string;
  readonly fingerprint: string;
}

export interface EvolutionEvent {
  readonly id: string;
  readonly eventType: string;
  readonly nodeId: string;
  readonly previousState: string;
  readonly newState: string;
  readonly timestamp: string;
  readonly snapshotId: string;
}

export interface VolatilityEvent {
  readonly id: string;
  readonly nodeId: string;
  readonly metricName: string;
  readonly oldValue: number;
  readonly newValue: number;
  readonly changeMagnitude: number;
  readonly timestamp: string;
  readonly snapshotId: string;
}

export interface SemanticMemory {
  readonly id: string;
  readonly concept: string;
  readonly context: string;
  readonly nodes: readonly string[];
  readonly edges: readonly string[];
  readonly fingerprint: string;
  readonly timestamp: string;
}

export interface GraphMemory {
  readonly id: string;
  readonly snapshotId: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly density: number;
  readonly sccCount: number;
  readonly timestamp: string;
}

export interface MetricsMemory {
  readonly id: string;
  readonly snapshotId: string;
  readonly instability: number;
  readonly propagationRisk: number;
  readonly fanInAvg: number;
  readonly fanOutAvg: number;
  readonly volatility: number;
  readonly timestamp: string;
}

export interface ReasoningMemory {
  readonly id: string;
  readonly chainId: string;
  readonly chainType: string;
  readonly conclusion: string;
  readonly evidenceIds: readonly string[];
  readonly confidence: number;
  readonly timestamp: string;
}

export interface RetrievalResult {
  readonly queryId: string;
  readonly entries: readonly MemoryEntry[];
  readonly findings: readonly ArchitecturalFinding[];
  readonly totalScore: number;
  readonly elapsedMs: number;
  readonly deterministicFingerprint: string;
}

export interface ContextEnvelope {
  readonly id: string;
  readonly entries: readonly MemoryEntry[];
  readonly findings: readonly ArchitecturalFinding[];
  readonly reasoningChains: readonly string[];
  readonly totalTokens: number;
  readonly budget: number;
  readonly overflow: boolean;
  readonly fingerprint: string;
}

export interface MemoryRelation {
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: string;
  readonly weight: number;
  readonly timestamp: string;
}

export interface MemoryFingerprint {
  readonly id: string;
  readonly hash: string;
  readonly algorithm: string;
  readonly components: readonly string[];
  readonly timestamp: string;
}
