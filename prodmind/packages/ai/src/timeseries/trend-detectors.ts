import type { ArchitectureTrend, TrendDataPoint, TimeseriesInput } from './timeseries-types.ts';
import { buildTrend } from './trend-analysis.ts';

function extractHealthScores(input: TimeseriesInput): TrendDataPoint[] {
  return input.historicalSnapshots
    .filter(s => s.healthScore !== undefined)
    .map(s => ({ snapshotId: s.id, timestamp: s.createdAt, value: 1 - s.healthScore! }));
}

function extractComplexityScores(input: TimeseriesInput): TrendDataPoint[] {
  return input.historicalSnapshots
    .filter(s => s.complexity !== undefined)
    .map(s => ({ snapshotId: s.id, timestamp: s.createdAt, value: s.complexity!.finalScore }));
}

function extractFragmentationScores(input: TimeseriesInput): TrendDataPoint[] {
  return input.historicalSnapshots
    .filter(s => s.complexity !== undefined)
    .map(s => ({ snapshotId: s.id, timestamp: s.createdAt, value: s.complexity!.fragmentationScore }));
}

function extractRiskScores(input: TimeseriesInput): TrendDataPoint[] {
  return input.historicalSnapshots
    .filter(s => s.risks && s.risks.length > 0)
    .map(s => ({
      snapshotId: s.id, timestamp: s.createdAt,
      value: Math.max(...s.risks!.map(r => r.normalizedScore)),
    }));
}

function extractHotspotCounts(input: TimeseriesInput): TrendDataPoint[] {
  return input.historicalSnapshots
    .filter(s => s.hotspots !== undefined)
    .map(s => ({ snapshotId: s.id, timestamp: s.createdAt, value: s.hotspots!.length }));
}

function extractPropagationScores(input: TimeseriesInput): TrendDataPoint[] {
  return input.historicalSnapshots
    .filter(s => s.propagationRisk && s.propagationRisk.length > 0)
    .map(s => ({
      snapshotId: s.id, timestamp: s.createdAt,
      value: Math.max(...s.propagationRisk!.map(p => p.propagationPressure)),
    }));
}

function extractCouplingDensity(input: TimeseriesInput): TrendDataPoint[] {
  return input.historicalSnapshots
    .filter(s => s.couplingDensity !== undefined)
    .map(s => ({ snapshotId: s.id, timestamp: s.createdAt, value: s.couplingDensity!.globalDensity }));
}

function normalizeSeverity(dataPoints: TrendDataPoint[]): number {
  if (dataPoints.length === 0) return 0;
  const avg = dataPoints.reduce((s, p) => s + p.value, 0) / dataPoints.length;
  return Math.min(avg, 1);
}

export function detectTrends(input: TimeseriesInput): ArchitectureTrend[] {
  const trends: ArchitectureTrend[] = [];

  const healthData = extractHealthScores(input);
  if (healthData.length >= 2) {
    trends.push(buildTrend({
      trendType: 'ARCHITECTURE_HEALTH_RECOVERY',
      dataPoints: healthData,
      normalizedSeverity: normalizeSeverity(healthData),
      impactedSystems: [],
      confidence: Math.min(healthData.length / 10, 1),
      evidenceRefs: healthData.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `Health: ${(d.value * 100).toFixed(0)}/100` })),
      metadata: { dataPointCount: healthData.length },
    }));
  }

  const complexityData = extractComplexityScores(input);
  if (complexityData.length >= 2) {
    trends.push(buildTrend({
      trendType: 'COMPLEXITY_GROWTH',
      dataPoints: complexityData,
      normalizedSeverity: normalizeSeverity(complexityData),
      impactedSystems: [],
      confidence: Math.min(complexityData.length / 10, 1),
      evidenceRefs: complexityData.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `Complexity: ${(d.value * 100).toFixed(0)}/100` })),
      metadata: { dataPointCount: complexityData.length },
    }));
  }

  const fragData = extractFragmentationScores(input);
  if (fragData.length >= 2) {
    trends.push(buildTrend({
      trendType: 'ARCHITECTURE_FRAGMENTATION',
      dataPoints: fragData,
      normalizedSeverity: normalizeSeverity(fragData),
      impactedSystems: [],
      confidence: Math.min(fragData.length / 10, 1),
      evidenceRefs: fragData.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `Fragmentation: ${(d.value * 100).toFixed(0)}/100` })),
      metadata: { dataPointCount: fragData.length },
    }));
  }

  const riskData = extractRiskScores(input);
  if (riskData.length >= 2) {
    trends.push(buildTrend({
      trendType: 'RISK_ACCELERATION',
      dataPoints: riskData,
      normalizedSeverity: normalizeSeverity(riskData),
      impactedSystems: [],
      confidence: Math.min(riskData.length / 10, 1),
      evidenceRefs: riskData.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `Max risk: ${(d.value * 100).toFixed(0)}/100` })),
      metadata: { dataPointCount: riskData.length },
    }));
  }

  const hotspotData = extractHotspotCounts(input);
  if (hotspotData.length >= 2) {
    trends.push(buildTrend({
      trendType: 'HOTSPOT_CONCENTRATION',
      dataPoints: hotspotData,
      normalizedSeverity: Math.min(normalizeSeverity(hotspotData) * 2, 1),
      impactedSystems: [],
      confidence: Math.min(hotspotData.length / 10, 1),
      evidenceRefs: hotspotData.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `Hotspots: ${d.value}` })),
      metadata: { dataPointCount: hotspotData.length },
    }));
  }

  const propData = extractPropagationScores(input);
  if (propData.length >= 2) {
    trends.push(buildTrend({
      trendType: 'PROPAGATION_EXPANSION',
      dataPoints: propData,
      normalizedSeverity: normalizeSeverity(propData),
      impactedSystems: [],
      confidence: Math.min(propData.length / 10, 1),
      evidenceRefs: propData.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `Max propagation: ${(d.value * 100).toFixed(0)}/100` })),
      metadata: { dataPointCount: propData.length },
    }));
  }

  const couplingData = extractCouplingDensity(input);
  if (couplingData.length >= 2) {
    trends.push(buildTrend({
      trendType: 'COUPLING_DRIFT',
      dataPoints: couplingData,
      normalizedSeverity: normalizeSeverity(couplingData),
      impactedSystems: [],
      confidence: Math.min(couplingData.length / 10, 1),
      evidenceRefs: couplingData.map(d => ({ source: 'snapshot', fingerprint: d.snapshotId, description: `Coupling: ${(d.value * 100).toFixed(1)}%` })),
      metadata: { dataPointCount: couplingData.length },
    }));
  }

  return trends;
}
