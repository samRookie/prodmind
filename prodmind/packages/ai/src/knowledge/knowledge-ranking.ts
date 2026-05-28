import type { KnowledgeNode, KnowledgeRelation } from './knowledge-types.ts';

export interface KnowledgeScore {
  nodeId: string;
  score: number;
  rank: number;
}

export function rankKnowledgeNodes(
  nodes: KnowledgeNode[],
  relations?: KnowledgeRelation[],
): KnowledgeScore[] {
  const relCount = new Map<string, number>();
  if (relations) {
    for (const rel of relations) {
      relCount.set(rel.sourceId, (relCount.get(rel.sourceId) ?? 0) + 1);
      relCount.set(rel.targetId, (relCount.get(rel.targetId) ?? 0) + 1);
    }
  }

  const scored = nodes.map(node => {
    let score = 0;
    const connectivity = relCount.get(node.id) ?? 0;
    score += Math.min(connectivity, 10);
    if (node.type === 'HOTSPOT' || node.type === 'RISK') score += 5;
    if (node.type === 'NARRATIVE' || node.type === 'REPORT') score += 3;
    if (node.type === 'RECOMMENDATION') score += 2;
    return { nodeId: node.id, score, rank: 0 };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
