export { EvidenceEngine } from './evidence-engine.ts';
export { EvidenceLinker } from './evidence-linker.ts';
export { EvidenceValidator } from './evidence-validator.ts';
export { serializeEvidencePayload, serializeEvidenceRecord, serializeEvidenceBatch } from './evidence-serializer.ts';
export type {
  EvidencePayload,
  EvidenceRecord,
  EvidenceLinkingInput,
  EvidenceEngineOutput,
  EvidenceValidationResult,
  GraphNodeRef,
  GraphEdgeRef,
  MetricRef,
  SCCRef,
  SemanticRef,
  RuleTriggerRef,
  TopologyChainRef,
  PropagationPathRef,
} from './evidence-types.ts';
