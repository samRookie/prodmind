import type { ExecutionGraph } from '../contracts/execution-contracts.ts';

export interface LevelGroup {
  readonly level: number;
  readonly nodeIds: readonly string[];
}

export function topologicalSort(graph: ExecutionGraph): readonly string[] {
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

  const result: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);
    for (const neighbor of adjacency[nodeId]!) {
      inDegree[neighbor]!--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
        queue.sort();
      }
    }
  }

  return Object.freeze(result);
}

export function topologicalSortWithLevels(graph: ExecutionGraph): readonly LevelGroup[] {
  const nodeIds = graph.nodes.map(n => n.id);
  const idSet = new Set(nodeIds);
  const inDegree: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};
  const level: Record<string, number> = {};

  for (const id of nodeIds) {
    inDegree[id] = 0;
    adjacency[id] = [];
    level[id] = 0;
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
      level[id] = 0;
    }
  }
  queue.sort();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    for (const neighbor of adjacency[nodeId]!) {
      inDegree[neighbor]!--;
      level[neighbor] = Math.max(level[neighbor]!, level[nodeId]! + 1);
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
        queue.sort();
      }
    }
  }

  const maxLevel = Math.max(0, ...nodeIds.map(id => level[id]!));
  const groups: LevelGroup[] = [];

  for (let lv = 0; lv <= maxLevel; lv++) {
    const ids = nodeIds.filter(id => level[id] === lv).sort();
    groups.push(Object.freeze({ level: lv, nodeIds: Object.freeze(ids) }));
  }

  return Object.freeze(groups);
}
