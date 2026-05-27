export type MemoryStorageType = 'snapshot' | 'semantic' | 'graph' | 'metrics' | 'reasoning';

export type IndexType = 'semantic' | 'graph' | 'metrics' | 'change' | 'dependency';

export type RetrievalDimension =
  | 'semantic_relevance'
  | 'graph_proximity'
  | 'dependency_impact'
  | 'temporal_recency'
  | 'volatility_importance'
  | 'architectural_criticality'
  | 'propagation_risk'
  | 'instability_score'
  | 'fan_in_out'
  | 'prior_reasoning';

export type ReasoningChainType =
  | 'dependency_impact'
  | 'architectural_drift'
  | 'propagation_risk'
  | 'cyclic_dependency'
  | 'instability_escalation';

export type TemporalEventType =
  | 'architecture_drift'
  | 'metric_evolution'
  | 'dependency_change'
  | 'hotspot_growth'
  | 'scc_change'
  | 'instability_change'
  | 'propagation_risk_change';

export type CompressionStrategy = 'priority' | 'relevance' | 'recency' | 'dedup';

export type FindingSeverity = 'info' | 'warning' | 'critical';
