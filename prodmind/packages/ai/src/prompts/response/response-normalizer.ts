import { sha256Truncated } from '../fingerprinting/canonical-hash.ts';
import { stableStringify } from '../serialization/stable-json.ts';
import type {
  AnalysisFinding,
  AnalysisRecommendation,
  NormalizedPromptResult,
  PromptExecutionMetrics,
  PromptFailure,
  PromptTrace,
  PromptTraceEntry,
  StructuredAnalysisResult,
} from '../contracts/prompt-contracts.ts';

function parseSectionsFromText(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionRegex = /^(?:#+\s*)?(.+?)[\s:]*\n([\s\S]*?)(?=\n(?:#+\s*)?(?:.+?)[\s:]*\n|$)/gm;
  let match: RegExpExecArray | null;
  while ((match = sectionRegex.exec(text)) !== null) {
    const key = match[1]!.trim().toLowerCase().replace(/\s+/g, '_');
    sections[key] = match[2]!.trim();
  }
  return sections;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function extractFindings(text: string): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];
  const findingRegex = /-\s*(critical|high|medium|low|info):\s*(.+?)(?:\n|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = findingRegex.exec(text)) !== null) {
    const severity = match[1]!.toLowerCase() as AnalysisFinding['severity'];
    findings.push({
      category: 'general',
      severity,
      title: match[2]!.trim(),
      description: match[2]!.trim(),
    });
  }
  findings.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99));
  return findings;
}

function extractRecommendations(text: string): AnalysisRecommendation[] {
  const recommendations: AnalysisRecommendation[] = [];
  const recRegex = /-\s*(critical|high|medium|low):\s*(.+?)(?:\n|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = recRegex.exec(text)) !== null) {
    const priority = match[1]!.toLowerCase() as AnalysisRecommendation['priority'];
    recommendations.push({
      priority,
      action: match[2]!.trim(),
      rationale: match[2]!.trim(),
    });
  }
  recommendations.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
  return recommendations;
}

function extractConfidence(text: string): number {
  const match = text.match(/confidence[:\s]+([0-9.]+)/i);
  if (match) {
    const val = parseFloat(match[1]!);
    return isNaN(val) ? 0 : Math.max(0, Math.min(1, val));
  }
  return 0;
}

export class ResponseNormalizer {
  async normalize(text: string): Promise<NormalizedPromptResult> {
    const sections = Object.freeze(Object.keys(parseSectionsFromText(text)));
    const tokenEstimate = Math.ceil(text.length / 4);
    const fingerprint = await sha256Truncated(stableStringify({ text, sections }));
    return Object.freeze({
      normalizedText: text.trim(),
      sections,
      fingerprint,
      tokenEstimate,
    });
  }

  toStructuredAnalysis(text: string): StructuredAnalysisResult {
    const sections = parseSectionsFromText(text);
    const findings = Object.freeze(extractFindings(text));
    const recommendations = Object.freeze(extractRecommendations(text));
    const confidence = extractConfidence(text);

    const executiveSummary = sections.executive_summary
      ?? sections.summary
      ?? text.split('\n')[0] ?? '';

    return Object.freeze({
      executiveSummary: executiveSummary.trim(),
      findings,
      recommendations,
      confidence,
      traceability: Object.freeze({ source: 'normalized_response' }),
      metadata: Object.freeze(sections),
    });
  }

  createTraceEntry(
    operation: string,
    details: Record<string, unknown>,
    durationMs: number,
  ): PromptTraceEntry {
    return Object.freeze({
      operation,
      timestamp: new Date().toISOString(),
      details: Object.freeze(details),
      durationMs,
    });
  }

  createTrace(entries: PromptTraceEntry[]): PromptTrace {
    const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const totalDurationMs = sorted.reduce((sum, e) => sum + e.durationMs, 0);
    return Object.freeze({
      entries: Object.freeze(sorted),
      totalDurationMs,
      operationCount: sorted.length,
    });
  }

  createMetrics(input: {
    totalDurationMs: number;
    selectedPromptId: string;
    selectedCategory: string;
    contextSliceCount: number;
    contextTokenCount: number;
    renderedTokenCount: number;
    envelopeSizeBytes: number;
    providerLatencyMs: number;
    normalizationDurationMs: number;
    stageCount: number;
    failure?: PromptFailure;
  }): PromptExecutionMetrics {
    return Object.freeze({
      totalDurationMs: input.totalDurationMs,
      selectedPromptId: input.selectedPromptId,
      selectedCategory: input.selectedCategory as PromptExecutionMetrics['selectedCategory'],
      contextSliceCount: input.contextSliceCount,
      contextTokenCount: input.contextTokenCount,
      renderedTokenCount: input.renderedTokenCount,
      envelopeSizeBytes: input.envelopeSizeBytes,
      providerLatencyMs: input.providerLatencyMs,
      normalizationDurationMs: input.normalizationDurationMs,
      stageCount: input.stageCount,
      failure: input.failure,
    });
  }
}
