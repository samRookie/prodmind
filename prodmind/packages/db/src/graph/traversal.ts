import { eq, and, inArray } from 'drizzle-orm';
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

    const nodeRows = currentLevel.length === 1
      ? await db.select().from(nodes).where(and(eq(nodes.id, currentLevel[0]!), eq(nodes.snapshotId, snapshotId))).limit(1)
      : await db.select().from(nodes).where(and(inArray(nodes.id, currentLevel), eq(nodes.snapshotId, snapshotId)));

    const nodeMap = new Map(nodeRows.map((n) => [n.id, n]));

    if (direction === 'forward' || direction === 'both') {
      const forwardEdges = currentLevel.length === 1
        ? await db.select().from(edges).where(and(eq(edges.sourceNodeId, currentLevel[0]!), eq(edges.snapshotId, snapshotId))).orderBy(edges.targetNodeId)
        : await db.select().from(edges).where(and(inArray(edges.sourceNodeId, currentLevel), eq(edges.snapshotId, snapshotId))).orderBy(edges.targetNodeId);

      for (const edge of forwardEdges) {
        levelEdges.push(edge);
        allEdges.push(edge);
        if (depth < maxDepth && !visited.has(edge.targetNodeId)) {
          visited.add(edge.targetNodeId);
          nextLevel.push(edge.targetNodeId);
        }
      }
    }

    if (direction === 'backward' || direction === 'both') {
      const backwardEdges = currentLevel.length === 1
        ? await db.select().from(edges).where(and(eq(edges.targetNodeId, currentLevel[0]!), eq(edges.snapshotId, snapshotId))).orderBy(edges.sourceNodeId)
        : await db.select().from(edges).where(and(inArray(edges.targetNodeId, currentLevel), eq(edges.snapshotId, snapshotId))).orderBy(edges.sourceNodeId);

      for (const edge of backwardEdges) {
        levelEdges.push(edge);
        allEdges.push(edge);
        if (depth < maxDepth && !visited.has(edge.sourceNodeId)) {
          visited.add(edge.sourceNodeId);
          nextLevel.push(edge.sourceNodeId);
        }
      }
    }

    for (const nodeId of currentLevel) {
      const node = nodeMap.get(nodeId);
      if (node) levelNodes.push(node);
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
