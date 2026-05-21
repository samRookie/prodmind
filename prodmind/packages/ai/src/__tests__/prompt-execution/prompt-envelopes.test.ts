import { describe, it, expect } from 'vitest';
import { createStructuredAnalysisResult, createEmptyProviderResponseEnvelope } from '../../prompts/envelopes/prompt-envelopes.ts';
import type { AnalysisFinding, AnalysisRecommendation } from '../../prompts/contracts/prompt-contracts.ts';

describe('createStructuredAnalysisResult', () => {
  it('sorts findings by severity', () => {
    const findings: AnalysisFinding[] = [
      { category: 'security', severity: 'low', title: 'Low issue', description: 'Minor' },
      { category: 'security', severity: 'critical', title: 'Critical issue', description: 'Major' },
      { category: 'security', severity: 'medium', title: 'Medium issue', description: 'Normal' },
    ];
    const result = createStructuredAnalysisResult({
      executiveSummary: 'Test',
      findings,
      recommendations: [],
      confidence: 0.9,
    });
    expect(result.findings[0]!.severity).toBe('critical');
    expect(result.findings[1]!.severity).toBe('medium');
    expect(result.findings[2]!.severity).toBe('low');
  });

  it('sorts recommendations by priority', () => {
    const recommendations: AnalysisRecommendation[] = [
      { priority: 'low', action: 'Low', rationale: 'r' },
      { priority: 'critical', action: 'Critical', rationale: 'r' },
    ];
    const result = createStructuredAnalysisResult({
      executiveSummary: 'Test',
      findings: [],
      recommendations,
      confidence: 0.8,
    });
    expect(result.recommendations[0]!.priority).toBe('critical');
    expect(result.recommendations[1]!.priority).toBe('low');
  });

  it('freezes the result deeply', () => {
    const result = createStructuredAnalysisResult({
      executiveSummary: 'Test',
      findings: [],
      recommendations: [],
      confidence: 0.5,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.findings)).toBe(true);
    expect(Object.isFrozen(result.recommendations)).toBe(true);
  });
});

describe('createEmptyProviderResponseEnvelope', () => {
  it('returns a frozen envelope with empty text', () => {
    const env = createEmptyProviderResponseEnvelope();
    expect(env.text).toBe('');
    expect(env.finishReason).toBe('error');
    expect(Object.isFrozen(env)).toBe(true);
  });
});
