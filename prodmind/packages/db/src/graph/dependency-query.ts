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
  maxCycles: number = 100,
): Promise<CircularDependency[]> {
  const { nodes: allNodes, edges: allEdges } = await getDependencyGraph(db, snapshotId);

  const adjacency = new Map<string, string[]>();
  for (const node of allNodes) {
    adjacency.set(node.id, []);
  }
  const adjEdge = new Map<string, Map<string, Edge>>();
  for (const edge of allEdges) {
    const list = adjacency.get(edge.sourceNodeId);
    if (list) list.push(edge.targetNodeId);
    if (!adjEdge.has(edge.sourceNodeId)) adjEdge.set(edge.sourceNodeId, new Map());
    adjEdge.get(edge.sourceNodeId)!.set(edge.targetNodeId, edge);
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

  const sortedNodes = [...allNodes].sort((a, b) => a.id.localeCompare(b.id));

  for (const startNode of sortedNodes) {
    if (color.get(startNode.id) !== WHITE) continue;

    const stack: Array<{ nodeId: string; path: string[]; iterIndex: number }> = [
      { nodeId: startNode.id, path: [startNode.id], iterIndex: 0 },
    ];
    const neighborLists = new Map<string, string[]>();
    neighborLists.set(startNode.id, (adjacency.get(startNode.id) ?? []).slice().sort());

    color.set(startNode.id, GRAY);

    while (stack.length > 0) {
      if (cycles.length >= maxCycles) break;

      const frame = stack[stack.length - 1]!;
      const neighbors = neighborLists.get(frame.nodeId) ?? [];

      if (frame.iterIndex >= neighbors.length) {
        color.set(frame.nodeId, BLACK);
        stack.pop();
        continue;
      }

      const neighbor = neighbors[frame.iterIndex]!;
      frame.iterIndex++;

      const neighborColor = color.get(neighbor);
      if (neighborColor === GRAY) {
        const cycleStart = frame.path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = frame.path.slice(cycleStart);
          const cycleEdges: Edge[] = [];
          for (let i = 0; i < cycle.length; i++) {
            const from = cycle[i]!;
            const to = cycle[(i + 1) % cycle.length]!;
            const edge = adjEdge.get(from)?.get(to);
            if (edge) cycleEdges.push(edge);
          }
          cycles.push({
            cycle: [...cycle],
            edges: cycleEdges.sort((a, b) => a.id.localeCompare(b.id)),
          });
        }
      } else if (neighborColor === WHITE) {
        color.set(neighbor, GRAY);
        neighborLists.set(neighbor, (adjacency.get(neighbor) ?? []).slice().sort());
        stack.push({ nodeId: neighbor, path: [...frame.path, neighbor], iterIndex: 0 });
      }
    }

    if (cycles.length >= maxCycles) break;
  }

  cycles.sort((a, b) => a.cycle[0]!.localeCompare(b.cycle[0]!));

  return cycles;
}
