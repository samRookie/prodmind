export { InsightEngine } from './insight-engine.ts';
export type { Insight, InsightInput, InsightOutput, EvidenceRef, InsightCategory, InsightSeverity, InsightScope } from './insight-types.ts';
export { INSIGHT_CATEGORIES, INSIGHT_SEVERITIES, INSIGHT_SCOPES } from './insight-types.ts';
export { fingerprintInsight, fingerprintInsightBatch, fingerprintEvidenceRef } from './insight-fingerprint.ts';
export {
  classifyHotspotSeverity,
  classifyInstabilitySeverity,
  classifyDepthSeverity,
  classifyPropagationSeverity,
  classifyCouplingSeverity,
  classifyArchitectureSeverity,
  classifyComplexitySeverity,
  classifyFragmentationSeverity,
  combineSeverities,
  severityToNumeric,
} from './insight-classifier.ts';
export { computePriorityScore, sortByPriority } from './insight-priority.ts';
export type { PriorityScore } from './insight-priority.ts';
export { normalizeInsight, normalizeInsightBatch, normalizeEvidenceList } from './insight-normalizer.ts';
export type { NormalizedInsight, NormalizedEvidenceRef } from './insight-normalizer.ts';
export { aggregateByCategory, aggregateByScope, summarizeInsights } from './insight-aggregation.ts';
export type { AggregatedCategory, AggregatedScope, InsightSummary } from './insight-aggregation.ts';
