import type { Explanation, Insight,ReasoningStep } from '../types/index.ts';

export function buildReasoningChain(
  insight: Insight,
): ReasoningStep[] {
  const steps: ReasoningStep[] = [];
  steps.push({
    order: 1,
    premise: `Category: ${insight.category}`,
    evidence: `Severity: ${insight.severity}, Confidence: ${(insight.scores.confidence * 100).toFixed(1)}%`,
    conclusion: `Identified as ${insight.category} with ${insight.severity} severity`,
  });
  steps.push({
    order: 2,
    premise: `Analysis based on ${insight.evidence.length} evidence points`,
    evidence: insight.evidence.map(e => `${e.type}: ${e.description}`).join('; '),
    conclusion: insight.summary,
  });
  steps.push({
    order: 3,
    premise: `Overall score: ${(insight.scores.overall * 100).toFixed(1)}%`,
    evidence: `Impact: ${(insight.scores.impact * 100).toFixed(1)}%, Urgency: ${(insight.scores.urgency * 100).toFixed(1)}%`,
    conclusion: insight.description,
  });
  return steps;
}

export function generateExplanation(insight: Insight): Explanation {
  const reasoning = buildReasoningChain(insight);
  return {
    insightId: insight.id,
    summary: insight.summary,
    reasoning,
    evidenceSummary: `${insight.evidence.length} evidence items across ${new Set(insight.evidence.map(e => e.type)).size} types`,
    graphContext: `${insight.context.nodeIds.length} nodes, ${insight.context.edgeIds.length} edges analyzed`,
    confidence: insight.scores.confidence,
    deterministic: true,
  };
}
