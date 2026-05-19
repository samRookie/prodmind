export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ProjectStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  EXTRACTING = 'EXTRACTING',
  PARSING = 'PARSING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum AnalysisType {
  STRUCTURE = 'STRUCTURE',
  DEPENDENCIES = 'DEPENDENCIES',
  COMPLEXITY = 'COMPLEXITY',
  SECURITY = 'SECURITY',
  ARCHITECTURE = 'ARCHITECTURE',
}

export enum StorageProvider {
  LOCAL = 'LOCAL',
  SQLITE = 'SQLITE',
}

export { SnapshotStatus, canTransitionTo } from './snapshot.ts';
export { NodeType, EdgeType } from './graph.ts';
export { JobStatus } from './job.ts';
export { SemanticType, CouplingType, RuleStrength } from './semantic.ts';
export { MetricType, MetricScope, MetricPriority, FanLevel, InstabilityLevel, ComplexityLevel } from './metrics.ts';
export { RetrievalScope, RetrievalStrategy, RetrievalOrdering } from './retrieval.ts';
export { ValidationSeverity, ValidationCategory, ValidationState } from './validation.ts';
