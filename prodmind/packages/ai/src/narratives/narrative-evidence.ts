import type { NarrativeEvidenceRef, NarrativeInput } from './narrative-types.ts';

export function aggregateNarrativeEvidence(input: NarrativeInput): NarrativeEvidenceRef[] {
  const refs: NarrativeEvidenceRef[] = [];
  for (const i of input.insights) refs.push({ source: 'insight', fingerprint: i.fingerprint, description: i.title });
  for (const p of input.patterns) refs.push({ source: 'pattern', fingerprint: p.fingerprint, description: p.title });
  for (const r of input.risks) refs.push({ source: 'risk', fingerprint: r.fingerprint, description: r.title });
  for (const r of input.recommendations) refs.push({ source: 'recommendation', fingerprint: r.fingerprint, description: r.title });
  for (const c of input.cognitionSnapshots) refs.push({ source: 'cognition', fingerprint: c.fingerprint, description: c.architectureSummary.substring(0, 100) });
  return refs.sort((a, b) => a.source.localeCompare(b.source) || a.fingerprint.localeCompare(b.fingerprint));
}

export function computeNarrativeSeverityDistribution(input: NarrativeInput): { critical: number; high: number; moderate: number; low: number } {
  const all: string[] = [];
  for (const i of input.insights) all.push(i.severity);
  for (const p of input.patterns) all.push(p.severity);
  for (const r of input.risks) all.push(r.severity);
  for (const r of input.recommendations) all.push(r.severity);
  return {
    critical: all.filter(s => s === 'CRITICAL').length,
    high: all.filter(s => s === 'HIGH').length,
    moderate: all.filter(s => s === 'MODERATE').length,
    low: all.filter(s => s === 'LOW').length,
  };
}

export function collectImpactedSystems(input: NarrativeInput): string[] {
  const systems = new Set<string>();
  for (const p of input.patterns) for (const n of p.impactedNodes) systems.add(n);
  for (const r of input.risks) for (const n of r.impactedNodes) systems.add(n);
  for (const r of input.recommendations) for (const n of r.impactedNodes) systems.add(n);
  for (const c of input.cognitionSnapshots) for (const h of c.criticalHotspots) systems.add(h.nodeId);
  return [...systems].sort();
}
