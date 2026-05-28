import { describe, expect, it } from 'vitest';
import { aggregateByCategory, aggregateByScope, summarizeInsights } from '../../insights/insight-aggregation.ts';
import type { Insight } from '../../insights/insight-types.ts';

function makeInsight(overrides: Partial<Insight>): Insight {
  return {
    type: 'HOTSPOT',
    severity: 'HIGH',
    scope: 'NODE',
    fingerprint: 'fp-1',
    title: 'Test',
    summary: 'Test summary',
    evidence: [],
    metadata: {},
    ...overrides,
  };
}

describe('InsightAggregation', () => {
  it('aggregates by category', () => {
    const insights: Insight[] = [
      makeInsight({ type: 'HOTSPOT', severity: 'HIGH', fingerprint: 'fp-1' }),
      makeInsight({ type: 'HOTSPOT', severity: 'CRITICAL', fingerprint: 'fp-2' }),
      makeInsight({ type: 'INSTABILITY', severity: 'HIGH', fingerprint: 'fp-3' }),
    ];

    const byCategory = aggregateByCategory(insights);
    expect(byCategory.length).toBe(2);

    const hotspot = byCategory.find((c) => c.category === 'HOTSPOT');
    expect(hotspot).toBeDefined();
    expect(hotspot!.total).toBe(2);
    expect(hotspot!.bySeverity.HIGH).toBe(1);
    expect(hotspot!.bySeverity.CRITICAL).toBe(1);
  });

  it('aggregates by scope', () => {
    const insights: Insight[] = [
      makeInsight({ scope: 'GLOBAL', fingerprint: 'fp-1' }),
      makeInsight({ scope: 'NODE', fingerprint: 'fp-2' }),
      makeInsight({ scope: 'NODE', fingerprint: 'fp-3' }),
    ];

    const byScope = aggregateByScope(insights);
    expect(byScope.length).toBe(2);

    const nodeScope = byScope.find((s) => s.scope === 'NODE');
    expect(nodeScope).toBeDefined();
    expect(nodeScope!.total).toBe(2);
  });

  it('summarizes insights', () => {
    const insights: Insight[] = [
      makeInsight({ type: 'HOTSPOT', severity: 'CRITICAL', scope: 'NODE', fingerprint: 'fp-1' }),
      makeInsight({ type: 'HOTSPOT', severity: 'HIGH', scope: 'NODE', fingerprint: 'fp-2' }),
      makeInsight({ type: 'INSTABILITY', severity: 'HIGH', scope: 'GLOBAL', fingerprint: 'fp-3' }),
    ];

    const summary = summarizeInsights(insights);
    expect(summary.totalInsights).toBe(3);
    expect(summary.byCategory.length).toBe(2);
    expect(summary.byScope.length).toBe(2);
    expect(summary.topSeverities[0]!.severity).toBe('HIGH');
  });

  it('handles empty list', () => {
    const summary = summarizeInsights([]);
    expect(summary.totalInsights).toBe(0);
    expect(summary.byCategory).toHaveLength(0);
  });
});
