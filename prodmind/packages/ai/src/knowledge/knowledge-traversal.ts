import type { KnowledgeTraversalResult, KnowledgeNode, KnowledgeRelation, RelationType, KnowledgeNodeType } from './knowledge-types.ts';
import type { KnowledgeGraphImpl } from './knowledge-graph.ts';
import { fingerprintTraversal } from './knowledge-fingerprint.ts';

const MAX_DEPTH = 10;
const MAX_NODES = 100;

export function traverseGraph(
  graph: KnowledgeGraphImpl,
  sourceIds: string[],
  options?: {
    maxDepth?: number;
    maxNodes?: number;
    relationTypes?: RelationType[];
    targetTypes?: KnowledgeNodeType[];
  },
): KnowledgeTraversalResult[] {
  const maxDepth = Math.min(options?.maxDepth ?? 5, MAX_DEPTH);
  const maxNodes = Math.min(options?.maxNodes ?? 50, MAX_NODES);
  const relationFilter = options?.relationTypes ? new Set(options.relationTypes) : null;
  const targetFilter = options?.targetTypes ? new Set(options.targetTypes) : null;

  const results: KnowledgeTraversalResult[] = [];

  for (const sourceId of sourceIds) {
    const startNode = graph.getNode(sourceId);
    if (!startNode) continue;

    const visited = new Set<string>();
    const queue: { nodeId: string; path: { node: KnowledgeNode; relation: KnowledgeRelation | null }[]; depth: number }[] = [
      { nodeId: sourceId, path: [{ node: startNode, relation: null }], depth: 0 },
    ];

    visited.add(sourceId);

    while (queue.length > 0 && results.length < maxNodes) {
      const current = queue.shift()!;
      const currentNode = graph.getNode(current.nodeId);
      if (!currentNode) continue;

      if (current.depth > 0) {
        const shouldInclude = !targetFilter || targetFilter.has(currentNode.type);
        if (shouldInclude) {
          results.push({
            path: [...current.path],
            depth: current.depth,
            fingerprint: '',
          });
        }
      }

      if (current.depth >= maxDepth) continue;

      const neighbors = graph.getOutgoingEdges(current.nodeId);
      for (const rel of neighbors) {
        if (relationFilter && !relationFilter.has(rel.relationType)) continue;
        if (visited.has(rel.targetId)) continue;
        visited.add(rel.targetId);

        const targetNode = graph.getNode(rel.targetId);
        if (!targetNode) continue;

        queue.push({
          nodeId: rel.targetId,
          path: [...current.path, { node: targetNode, relation: rel }],
          depth: current.depth + 1,
        });
      }
    }
  }

  for (const result of results) {
    result.fingerprint = fingerprintTraversal(result);
  }

  return results.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
}

export function findNeighborhood(
  graph: KnowledgeGraphImpl,
  nodeId: string,
  radius: number = 2,
): { node: KnowledgeNode; relation: KnowledgeRelation | null; depth: number }[] {
  const maxR = Math.min(radius, MAX_DEPTH);
  const visited = new Set<string>();
  const queue: { nodeId: string; relation: KnowledgeRelation | null; depth: number }[] = [
    { nodeId, relation: null, depth: 0 },
  ];
  const neighborhood: { node: KnowledgeNode; relation: KnowledgeRelation | null; depth: number }[] = [];

  visited.add(nodeId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = graph.getNode(current.nodeId);
    if (!node) continue;
    neighborhood.push({ node, relation: current.relation, depth: current.depth });

    if (current.depth >= maxR) continue;

    for (const rel of graph.getOutgoingEdges(current.nodeId)) {
      if (!visited.has(rel.targetId)) {
        visited.add(rel.targetId);
        queue.push({ nodeId: rel.targetId, relation: rel, depth: current.depth + 1 });
      }
    }
    for (const rel of graph.getIncomingEdges(current.nodeId)) {
      if (!visited.has(rel.sourceId)) {
        visited.add(rel.sourceId);
        queue.push({ nodeId: rel.sourceId, relation: rel, depth: current.depth + 1 });
      }
    }
  }

  return neighborhood;
}
