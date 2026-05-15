import type { Database } from '../client.ts';
import { nodes } from '../schema/nodes.ts';
import { eq, and } from 'drizzle-orm';
import type { Node } from '../schema/nodes.ts';
import type { Edge } from '../schema/edges.ts';
import { bfsTraversal } from './traversal.ts';

export interface ImpactItem {
  node: Node;
  depth: number;
  edges: Edge[];
}

export interface BlastRadiusResult {
  entryPoint: Node;
  directImpacts: ImpactItem[];
  indirectImpacts: ImpactItem[];
  totalAffected: number;
  maxDepth: number;
}

export async function computeBlastRadius(
  db: Database,
  snapshotId: string,
  nodeId: string,
  config?: { maxDepth?: number },
): Promise<BlastRadiusResult> {
  const maxDepth = config?.maxDepth ?? 10;

  const [entryResult] = await db
    .select()
    .from(nodes)
    .where(and(eq(nodes.id, nodeId), eq(nodes.snapshotId, snapshotId)))
    .limit(1);

  if (!entryResult) {
    throw new Error(`Node ${nodeId} not found in snapshot ${snapshotId}`);
  }

  const [forwardTraversal, backwardTraversal] = await Promise.all([
    bfsTraversal(db, snapshotId, nodeId, {
      maxDepth,
      direction: 'forward',
    }),
    bfsTraversal(db, snapshotId, nodeId, {
      maxDepth,
      direction: 'backward',
    }),
  ]);

  const directSet = new Set<string>();
  const indirectSet = new Set<string>();

  const directImpacts: ImpactItem[] = [];
  const indirectImpacts: ImpactItem[] = [];

  const processLevels = (
    traversal: typeof forwardTraversal,
    impacts: ImpactItem[],
    impactSet: Set<string>,
  ) => {
    for (const level of traversal.levels) {
      if (level.depth === 0) continue;
      for (const node of level.nodes) {
        if (node.id === nodeId) continue;
        if (!impactSet.has(node.id)) {
          impactSet.add(node.id);
          impacts.push({
            node,
            depth: level.depth,
            edges: level.edges.filter(
              (e) => e.sourceNodeId === node.id || e.targetNodeId === node.id,
            ),
          });
        }
      }
    }
  };

  processLevels(forwardTraversal, directImpacts, directSet);
  processLevels(backwardTraversal, indirectImpacts, indirectSet);

  const allAffected = new Map<string, ImpactItem>();
  for (const item of [...directImpacts, ...indirectImpacts]) {
    const key = item.node.id;
    const existing = allAffected.get(key);
    if (!existing || item.depth < existing.depth) {
      allAffected.set(key, item);
    }
  }

  const directs: ImpactItem[] = [];
  const indirects: ImpactItem[] = [];

  for (const [, item] of allAffected) {
    if (item.depth <= 1) {
      directs.push(item);
    } else {
      indirects.push(item);
    }
  }

  directs.sort((a, b) => a.node.id.localeCompare(b.node.id));
  indirects.sort((a, b) => a.node.id.localeCompare(b.node.id));

  return {
    entryPoint: entryResult,
    directImpacts: directs,
    indirectImpacts: indirects,
    totalAffected: allAffected.size,
    maxDepth,
  };
}
