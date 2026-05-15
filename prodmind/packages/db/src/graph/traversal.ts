import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { nodes } from '../schema/nodes.ts';
import { edges } from '../schema/edges.ts';
import type { Node } from '../schema/nodes.ts';
import type { Edge } from '../schema/edges.ts';

export interface TraversalConfig {
  maxDepth?: number;
  direction?: 'forward' | 'backward' | 'both';
}

export interface TraversalLevel {
  depth: number;
  nodes: Node[];
  edges: Edge[];
}

export interface TraversalResult {
  levels: TraversalLevel[];
  visited: string[];
  edges: Edge[];
  nodeCount: number;
  edgeCount: number;
}

export async function bfsTraversal(
  db: Database,
  snapshotId: string,
  startNodeId: string,
  config?: TraversalConfig,
): Promise<TraversalResult> {
  const maxDepth = config?.maxDepth ?? 10;
  const direction = config?.direction ?? 'forward';

  const visited = new Set<string>();
  const levels: TraversalLevel[] = [];
  const allEdges: Edge[] = [];

  visited.add(startNodeId);

  let currentLevel: string[] = [startNodeId];
  let depth = 0;

  while (currentLevel.length > 0 && depth <= maxDepth) {
    const levelNodes: Node[] = [];
    const levelEdges: Edge[] = [];
    const nextLevel: string[] = [];

    for (const nodeId of currentLevel) {
      const nodeResult = await db
        .select()
        .from(nodes)
        .where(and(eq(nodes.id, nodeId), eq(nodes.snapshotId, snapshotId)))
        .limit(1);

      if (nodeResult[0]) {
        levelNodes.push(nodeResult[0]);
      }

      let edgeRows: Edge[];

      if (direction === 'forward' || direction === 'both') {
        edgeRows = await db
          .select()
          .from(edges)
          .where(
            and(
              eq(edges.sourceNodeId, nodeId),
              eq(edges.snapshotId, snapshotId),
            ),
          )
          .orderBy(edges.targetNodeId);

        for (const edge of edgeRows) {
          levelEdges.push(edge);
          allEdges.push(edge);
          if (depth < maxDepth && !visited.has(edge.targetNodeId)) {
            visited.add(edge.targetNodeId);
            nextLevel.push(edge.targetNodeId);
          }
        }
      }

      if (direction === 'backward' || direction === 'both') {
        edgeRows = await db
          .select()
          .from(edges)
          .where(
            and(
              eq(edges.targetNodeId, nodeId),
              eq(edges.snapshotId, snapshotId),
            ),
          )
          .orderBy(edges.sourceNodeId);

        for (const edge of edgeRows) {
          levelEdges.push(edge);
          allEdges.push(edge);
          if (depth < maxDepth && !visited.has(edge.sourceNodeId)) {
            visited.add(edge.sourceNodeId);
            nextLevel.push(edge.sourceNodeId);
          }
        }
      }
    }

    levels.push({
      depth,
      nodes: levelNodes.sort((a, b) => a.id.localeCompare(b.id)),
      edges: levelEdges.sort((a, b) => a.id.localeCompare(b.id)),
    });

    currentLevel = nextLevel;
    depth++;
  }

  return {
    levels,
    visited: Array.from(visited).sort(),
    edges: allEdges.sort((a, b) => a.id.localeCompare(b.id)),
    nodeCount: visited.size,
    edgeCount: allEdges.length,
  };
}
