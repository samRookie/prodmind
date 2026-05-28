import { computeInsightFingerprint } from '../core/insight-fingerprint.ts';
import type { Insight, ReplayValidationResult } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export function validateInsightReplay(
  original: Insight,
  replayed: Insight,
): ReplayValidationResult {
  const originalFp = original.fingerprint;
  const replayedFp = replayed.fingerprint;
  const deterministic = originalFp === replayedFp;
  let matchScore = 1;
  const diffs: string[] = [];
  if (!deterministic) {
    matchScore = 0;
    diffs.push('fingerprint mismatch');
  }
  if (original.scores.overall !== replayed.scores.overall) {
    matchScore -= 0.2;
    diffs.push(`overall score: ${original.scores.overall} vs ${replayed.scores.overall}`);
  }
  if (original.scores.confidence !== replayed.scores.confidence) {
    matchScore -= 0.2;
    diffs.push(`confidence: ${original.scores.confidence} vs ${replayed.scores.confidence}`);
  }
  if (original.evidence.length !== replayed.evidence.length) {
    matchScore -= 0.2;
    diffs.push(`evidence count: ${original.evidence.length} vs ${replayed.evidence.length}`);
  }
  return {
    insightId: original.id,
    replayId: generateId('replay'),
    deterministic,
    matchScore: Math.max(0, matchScore),
    diffs,
  };
}

export function verifyDeterministicInsight(insight: Insight): boolean {
  const expectedFingerprint = computeInsightFingerprint(
    insight.category,
    insight.severity,
    insight.title,
    [...insight.context.nodeIds, ...insight.context.edgeIds],
    insight.evidence.map(e => e.fingerprint),
  );
  return insight.fingerprint === expectedFingerprint;
}
