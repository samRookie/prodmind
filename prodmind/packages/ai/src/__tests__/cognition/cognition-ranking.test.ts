import { describe, it, expect } from 'vitest';
import { rankSnapshots, selectMostCritical } from '../../cognition/cognition-ranking.ts';
import type { CognitionSnapshot } from '../../cognition/cognition-types.ts';

function makeSnap(health: number, fp: string): CognitionSnapshot {
  return {
    cognitionType: 'GLOBAL', fingerprint: fp, architectureSummary: '', dominantRisks: [], dominantPatterns: [],
    topRecommendations: [], criticalHotspots: [], evidenceReferences: [],
    confidenceSummary: { overall: 0, insightConfidence: 0, patternConfidence: 0, riskConfidence: 0, recommendationConfidence: 0 },
    severityDistribution: { critical: 0, high: 0, moderate: 0, low: 0 },
    healthScore: { overall: health, label: 'MODERATE', complexity: 0, instability: 0, propagationRisk: 0, sccDensity: 0, fragmentation: 0, antiPatternDensity: 0, recommendationSeverity: 0, architectureDepth: 0 },
    metadata: {},
  };
}

describe('rankSnapshots', () => {
  it('sorts by health ascending (worst first)', () => {
    const snaps = [makeSnap(0.9, 'c'), makeSnap(0.3, 'a'), makeSnap(0.6, 'b')];
    const ranked = rankSnapshots(snaps);
    expect(ranked[0]!.healthScore.overall).toBe(0.3);
    expect(ranked[2]!.healthScore.overall).toBe(0.9);
  });
});

describe('selectMostCritical', () => {
  it('returns N most critical snapshots', () => {
    const snaps = [makeSnap(0.3, 'a'), makeSnap(0.6, 'b'), makeSnap(0.9, 'c')];
    const critical = selectMostCritical(snaps, 2);
    expect(critical).toHaveLength(2);
    expect(critical[0]!.healthScore.overall).toBe(0.3);
    expect(critical[1]!.healthScore.overall).toBe(0.6);
  });
});
