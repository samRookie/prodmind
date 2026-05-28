import type { IndexBuildInput } from './indexing-types.ts';

export function normalizeBuildInput(input: IndexBuildInput): IndexBuildInput {
  return {
    nodes: input.nodes ? [...input.nodes].sort((a, b) => a.id.localeCompare(b.id)) : undefined,
    edges: input.edges ? [...input.edges].sort((a, b) => `${a.sourceId}:${a.targetId}`.localeCompare(`${b.sourceId}:${b.targetId}`)) : undefined,
    sccs: input.sccs ? [...input.sccs].sort((a, b) => a.id.localeCompare(b.id)).map(s => ({ ...s, nodes: [...s.nodes].sort() })) : undefined,
    hotspots: input.hotspots ? [...input.hotspots].sort((a, b) => a.nodeId.localeCompare(b.nodeId)) : undefined,
    risks: input.risks ? [...input.risks].sort((a, b) => (a.id ?? a.riskType).localeCompare(b.id ?? b.riskType)) : undefined,
    patterns: input.patterns ? [...input.patterns].sort((a, b) => (a.id ?? a.patternType).localeCompare(b.id ?? b.patternType)) : undefined,
    recommendations: input.recommendations ? [...input.recommendations].sort((a, b) => (a.id ?? a.title).localeCompare(b.id ?? b.title)) : undefined,
    cognitions: input.cognitions ? [...input.cognitions].sort((a, b) => (a.id ?? a.fingerprint).localeCompare(b.id ?? b.fingerprint)) : undefined,
    narratives: input.narratives ? [...input.narratives].sort((a, b) => (a.id ?? a.fingerprint).localeCompare(b.id ?? b.fingerprint)) : undefined,
    trends: input.trends ? [...input.trends].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)) : undefined,
  };
}
