import type { ExecutionGraph } from '../contracts/execution-contracts.ts';

export interface CycleInfo {
  readonly hasCycle: boolean;
  readonly cycles: readonly string[];
}

export function detectCycles(graph: ExecutionGraph): CycleInfo {
  const nodeIds = graph.nodes.map(n => n.id);
  const idSet = new Set(nodeIds);
  const inDegree: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};

  for (const id of nodeIds) {
    inDegree[id] = 0;
    adjacency[id] = [];
  }

  for (const edge of graph.edges) {
    if (idSet.has(edge.source) && idSet.has(edge.target)) {
      adjacency[edge.source]!.push(edge.target);
      inDegree[edge.target]!++;
    }
  }

  for (const node of graph.nodes) {
    for (const dep of node.dependencies) {
      if (idSet.has(dep) && idSet.has(node.id)) {
        adjacency[dep]!.push(node.id);
        inDegree[node.id]!++;
      }
    }
  }

  const queue: string[] = [];
  for (const id of nodeIds) {
    if (inDegree[id] === 0) {
      queue.push(id);
    }
  }
  queue.sort();

  const sorted: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    sorted.push(nodeId);
    for (const neighbor of adjacency[nodeId]!) {
      inDegree[neighbor]!--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
        queue.sort();
      }
    }
  }

  const hasCycle = sorted.length !== nodeIds.length;

  if (!hasCycle) {
    return Object.freeze({ hasCycle: false, cycles: Object.freeze([]) });
  }

  const cycleNodes = nodeIds.filter(id => inDegree[id]! > 0);
  return Object.freeze({
    hasCycle: true,
    cycles: Object.freeze(cycleNodes.map(id => `Node "${id}" is part of a cycle (indegree ${inDegree[id]})`)),
  });
}

export function hasCycle(graph: ExecutionGraph): boolean {
  return detectCycles(graph).hasCycle;
}
