import type { MemoryStorageType, IndexType, RetrievalDimension, ReasoningChainType, TemporalEventType, CompressionStrategy, FindingSeverity } from './memory-types.ts';

export const MEMORY_STORAGE_TYPES: readonly MemoryStorageType[] = Object.freeze([
  'snapshot', 'semantic', 'graph', 'metrics', 'reasoning',
] as const);

export const INDEX_TYPES: readonly IndexType[] = Object.freeze([
  'semantic', 'graph', 'metrics', 'change', 'dependency',
] as const);

export const RETRIEVAL_DIMENSIONS: readonly RetrievalDimension[] = Object.freeze([
  'semantic_relevance', 'graph_proximity', 'dependency_impact',
  'temporal_recency', 'volatility_importance', 'architectural_criticality',
  'propagation_risk', 'instability_score', 'fan_in_out', 'prior_reasoning',
] as const);

export const REASONING_CHAIN_TYPES: readonly ReasoningChainType[] = Object.freeze([
  'dependency_impact', 'architectural_drift', 'propagation_risk',
  'cyclic_dependency', 'instability_escalation',
] as const);

export const TEMPORAL_EVENT_TYPES: readonly TemporalEventType[] = Object.freeze([
  'architecture_drift', 'metric_evolution', 'dependency_change',
  'hotspot_growth', 'scc_change', 'instability_change', 'propagation_risk_change',
] as const);

export const COMPRESSION_STRATEGIES: readonly CompressionStrategy[] = Object.freeze([
  'priority', 'relevance', 'recency', 'dedup',
] as const);

export const FINDING_SEVERITIES: readonly FindingSeverity[] = Object.freeze([
  'info', 'warning', 'critical',
] as const);
