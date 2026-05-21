import { describe, it, expect } from 'vitest';
import { emptyStructuredAnalysis, createFindings, createRecommendations } from '../../prompts/scoring/structured-analysis.ts';

describe('emptyStructuredAnalysis', () => {
  it('returns a frozen empty result', () => {
    const result = emptyStructuredAnalysis();
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.executiveSummary).toBe('');
    expect(result.findings).toHaveLength(0);
    expect(result.recommendations).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });
});

describe('createFindings', () => {
  it('sorts findings by severity', () => {
    const items = [
      { category: 'arch', severity: 'low' as const, title: 'Low', description: 'desc' },
      { category: 'arch', severity: 'critical' as const, title: 'Critical', description: 'desc' },
    ];
    const findings = createFindings(items);
    expect(findings[0]!.severity).toBe('critical');
    expect(findings[1]!.severity).toBe('low');
    expect(Object.isFrozen(findings)).toBe(true);
    expect(Object.isFrozen(findings[0])).toBe(true);
  });

  it('returns empty array for empty input', () => {
    expect(createFindings([])).toHaveLength(0);
  });
});

describe('createRecommendations', () => {
  it('sorts recommendations by priority', () => {
    const items = [
      { priority: 'low' as const, action: 'Low', rationale: 'r' },
      { priority: 'critical' as const, action: 'Critical', rationale: 'r' },
    ];
    const recs = createRecommendations(items);
    expect(recs[0]!.priority).toBe('critical');
    expect(recs[1]!.priority).toBe('low');
    expect(Object.isFrozen(recs)).toBe(true);
  });
});
