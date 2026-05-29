import type { TemporalEvidence } from '../types/index.ts';

export interface ReasoningStep {
  order: number;
  description: string;
  confidence: number;
  evidenceType: string;
}

export interface ReasoningChain {
  steps: ReasoningStep[];
  narrative: string;
  overallConfidence: number;
}

export function buildReasoningChain(evidenceList: TemporalEvidence[]): ReasoningChain {
  const steps = evidenceList.map((e, i) => ({
    order: i + 1,
    description: e.description,
    confidence: e.confidence,
    evidenceType: e.type,
  }));
  const overallConfidence = steps.length > 0
    ? steps.reduce((s, step) => s + step.confidence, 0) / steps.length
    : 0;
  const stepDescriptions = steps.map((s) => `${s.order}. ${s.description}`);
  return {
    steps,
    narrative: `Reasoning chain: ${stepDescriptions.join(' -> ')}`,
    overallConfidence,
  };
}
