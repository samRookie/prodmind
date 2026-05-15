import { eq, and, inArray } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { nodes } from '../schema/nodes.ts';
import { edges } from '../schema/edges.ts';
import type { Node } from '../schema/nodes.ts';
import type { Edge } from '../schema/edges.ts';

export interface CircularDependency {
  cycle: string[];
  edges: Edge[];
}

export async function getDependencyGraph(
  db: Database,
  snapshotId: string,
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const [nodeList, edgeList] = await Promise.all([
    db.select().from(nodes).where(eq(nodes.snapshotId, snapshotId)).orderBy(nodes.id),
    db.select().from(edges).where(eq(edges.snapshotId, snapshotId)).orderBy(edges.id),
  ]);

  return { nodes: nodeList, edges: edgeList };
}

export async function getSubgraph(
  db: Database,
  snapshotId: string,
  nodeIds: string[],
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const [nodeList, edgeList] = await Promise.all([
    db
      .select()
      .from(nodes)
      .where(and(eq(nodes.snapshotId, snapshotId), inArray(nodes.id, nodeIds)))
      .orderBy(nodes.id),
    db
      .select()
      .from(edges)
      .where(
        and(
          eq(edges.snapshotId, snapshotId),
          inArray(edges.sourceNodeId, nodeIds),
          inArray(edges.targetNodeId, nodeIds),
        ),
      )
      .orderBy(edges.id),
  ]);

  return { nodes: nodeList, edges: edgeList };
}

export async function getCircularDependencies(
  db: Database,
  snapshotId: string,
): Promise<CircularDependency[]> {
  const { nodes: allNodes, edges: allEdges } = await getDependencyGraph(db, snapshotId);

  const adjacency = new Map<string, string[]>();
  for (const node of allNodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of allEdges) {
    const list = adjacency.get(edge.sourceNodeId);
    if (list) list.push(edge.targetNodeId);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const cycles: CircularDependency[] = [];

  for (const node of allNodes) {
    color.set(node.id, WHITE);
    parent.set(node.id, null);
  }

  function dfs(current: string, path: string[]) {
    color.set(current, GRAY);
    path.push(current);

    const neighbors = adjacency.get(current) ?? [];
    for (const neighbor of neighbors.sort()) {
      const neighborColor = color.get(neighbor);
      if (neighborColor === GRAY) {
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          const cycleEdges: Edge[] = [];
          for (let i = 0; i < cycle.length; i++) {
            const from = cycle[i]!;
            const to = cycle[(i + 1) % cycle.length]!;
            const edge = allEdges.find(
              (e) => e.sourceNodeId === from && e.targetNodeId === to,
            );
            if (edge) cycleEdges.push(edge);
          }
          cycles.push({
            cycle: [...cycle],
            edges: cycleEdges.sort((a, b) => a.id.localeCompare(b.id)),
          });
        }
      } else if (neighborColor === WHITE) {
        dfs(neighbor, path);
      }
    }

    path.pop();
    color.set(current, BLACK);
  }

  const sortedNodes = [...allNodes].sort((a, b) => a.id.localeCompare(b.id));
  for (const node of sortedNodes) {
    if (color.get(node.id) === WHITE) {
      dfs(node.id, []);
    }
  }

  cycles.sort((a, b) => a.cycle[0]!.localeCompare(b.cycle[0]!));

  return cycles;
}
