import type { Insight, InsightCategory, InsightScores,InsightSeverity } from '../types/index.ts';
import type { InsightContext } from '../types/index.ts';
import { generateId, timestamp } from '../utils/index.ts';
import { classifyInsight, computeConfidence } from './insight-classification.ts';
import { createInsightContext } from './insight-context.ts';
import { computeInsightFingerprint } from './insight-fingerprint.ts';

export interface GenerateInsightParams {
  category: InsightCategory;
  title: string;
  description: string;
  summary: string;
  severity?: InsightSeverity;
  context?: Partial<InsightContext>;
  evidenceFingerprints?: string[];
  scores?: Partial<InsightScores>;
  sourceGraphSnapshot?: string;
}

export function generateInsight(params: GenerateInsightParams): Insight {
  const id = generateId('insight');
  const confidence = computeConfidence(
    params.evidenceFingerprints?.length ?? 0,
    true,
  );
  const impact = params.scores?.impact ?? 0.5;
  const urgency = params.scores?.urgency ?? 0.5;
  const complexity = params.scores?.complexity ?? 0.5;
  const classification = classifyInsight({
    category: params.category,
    confidence,
    impact,
    urgency,
    complexity,
  });
  const severity = params.severity ?? classification.severity;
  const context = createInsightContext(
    params.context?.nodeIds,
    params.context?.edgeIds,
    params.context?.traversalIds,
    params.context?.metricKeys,
    params.context?.semanticRegionIds,
    params.context?.snapshotIds,
  );
  const fingerprint = computeInsightFingerprint(
    params.category,
    severity,
    params.title,
    [...context.nodeIds, ...context.edgeIds],
    params.evidenceFingerprints ?? [],
  );
  return {
    id,
    category: params.category,
    severity,
    status: 'active',
    title: params.title,
    description: params.description,
    summary: params.summary,
    fingerprint,
    context,
    evidence: [],
    scores: {
      overall: classification.overall,
      confidence,
      severity: severity === 'CRITICAL' ? 4 : severity === 'HIGH' ? 3 : severity === 'MODERATE' ? 2 : 1,
      impact,
      urgency,
      complexity,
    },
    timestamp: timestamp(),
    expiration: null,
    sourceGraphSnapshot: params.sourceGraphSnapshot ?? null,
    remediationIds: [],
    relatedInsightIds: [],
  };
}
