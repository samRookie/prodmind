import { describe, it, expect } from 'vitest';
import { renderArchitectureSummary, collectArchitectureMetrics } from '../../narratives/templates/architecture-summary.ts';
import { renderHotspotSummary, collectHotspotMetrics } from '../../narratives/templates/hotspot-summary.ts';
import { renderRiskSummary } from '../../narratives/templates/risk-summary.ts';
import { renderRecommendationSummary } from '../../narratives/templates/recommendation-summary.ts';
import { renderCognitionSummary } from '../../narratives/templates/cognition-summary.ts';
import { renderStabilitySummary } from '../../narratives/templates/stability-summary.ts';
import { renderPropagationSummary } from '../../narratives/templates/propagation-summary.ts';
import type { NarrativeInput } from '../../narratives/narrative-types.ts';

const baseInput: NarrativeInput = {
  snapshotId: 's1', cognitionSnapshots: [
    { cognitionType: 'GLOBAL', fingerprint: 'fp', architectureSummary: 'System has 2 clusters', dominantRisks: [], dominantPatterns: [], topRecommendations: [], criticalHotspots: [], healthScore: { overall: 0.5, label: 'MODERATE' }, severityDistribution: { critical: 0, high: 0, moderate: 0, low: 0 }, confidenceSummary: { overall: 0.5 } },
  ], patterns: [], risks: [], recommendations: [], insights: [],
  couplingDensity: { globalDensity: 0.1, clusterDensities: [] },
  complexity: { finalScore: 0.5, complexityLevel: 'HIGH', fragmentationScore: 0.1 },
  propagationRisk: [], instability: [],
};

describe('NarrativeTemplates', () => {
  it('renderArchitectureSummary produces deterministic output', () => {
    const a = renderArchitectureSummary(baseInput);
    const b = renderArchitectureSummary(baseInput);
    expect(a).toBe(b);
  });

  it('renderHotspotSummary returns no hotspots when empty', () => {
    const result = renderHotspotSummary(baseInput);
    expect(result).toContain('No critical hotspots');
  });

  it('renderRiskSummary returns no risks when empty', () => {
    const result = renderRiskSummary(baseInput);
    expect(result).toContain('No risks');
  });

  it('renderRecommendationSummary returns none when empty', () => {
    const result = renderRecommendationSummary(baseInput);
    expect(result).toContain('No recommendations');
  });

  it('renderCognitionSummary works with global snapshot', () => {
    const result = renderCognitionSummary(baseInput);
    expect(result).toContain('Health score');
  });

  it('renderStabilitySummary returns stable when no high instability', () => {
    const result = renderStabilitySummary(baseInput);
    expect(result).toContain('No critical instability');
  });

  it('renderPropagationSummary returns none when no high pressure', () => {
    const result = renderPropagationSummary(baseInput);
    expect(result).toContain('No high-risk propagation');
  });

  it('collectArchitectureMetrics returns sorted metrics', () => {
    const metrics = collectArchitectureMetrics(baseInput);
    const types = metrics.map(m => m.metricType);
    expect(types).toEqual([...types].sort());
  });

  it('collectHotspotMetrics returns zero counts when empty', () => {
    const metrics = collectHotspotMetrics(baseInput);
    expect(metrics.every(m => m.metricValue === 0)).toBe(true);
  });
});
