import { sha256Truncated } from '../fingerprinting/canonical-hash.ts';
import { stableStringify } from '../serialization/stable-json.ts';
import { createStructuredAnalysisResult } from '../envelopes/prompt-envelopes.ts';
import type { AnalysisFinding, AnalysisRecommendation, StructuredAnalysisResult } from '../contracts/prompt-contracts.ts';

export function emptyStructuredAnalysis(): StructuredAnalysisResult {
  return createStructuredAnalysisResult({
    executiveSummary: '',
    findings: [],
    recommendations: [],
    confidence: 0,
  });
}

export async function fingerprintStructuredAnalysis(result: StructuredAnalysisResult): Promise<string> {
  const clean = {
    findings: result.findings.map((f) => ({
      category: f.category,
      severity: f.severity,
      title: f.title,
    })),
    recommendations: result.recommendations.map((r) => ({
      priority: r.priority,
      action: r.action,
    })),
    confidence: result.confidence,
  };
  return sha256Truncated(stableStringify(clean));
}

export function createFindings(
  items: Array<{
    category: string;
    severity: AnalysisFinding['severity'];
    title: string;
    description: string;
    location?: string;
    recommendation?: string;
  }>,
): readonly AnalysisFinding[] {
  const sorted = [...items].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
  });
  return Object.freeze(sorted.map((f) => Object.freeze(f)));
}

export function createRecommendations(
  items: Array<{
    priority: AnalysisRecommendation['priority'];
    action: string;
    rationale: string;
  }>,
): readonly AnalysisRecommendation[] {
  const sorted = [...items].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
  });
  return Object.freeze(sorted.map((r) => Object.freeze(r)));
}
