import type { ExecutionGraph, ExecutionState } from '../contracts/execution-contracts.ts';

export interface ExecutionFrontier {
  readonly ready: readonly string[];
  readonly blocked: readonly string[];
  readonly completed: readonly string[];
  readonly failed: readonly string[];
  readonly allDone: boolean;
}

function getDependencies(nodeId: string, graph: ExecutionGraph): readonly string[] {
  const edges = graph.edges.filter(e => e.target === nodeId).map(e => e.source);
  const node = graph.nodes.find(n => n.id === nodeId);
  const deps = node ? [...node.dependencies] : [];
  return Object.freeze([...new Set([...edges, ...deps])]);
}

export function getReadyNodes(graph: ExecutionGraph, nodeStates: Readonly<Record<string, ExecutionState>>): readonly string[] {
  const ready: string[] = [];

  for (const node of graph.nodes) {
    const state = nodeStates[node.id];
    if (state !== 'pending' && state !== 'ready') continue;

    const deps = getDependencies(node.id, graph);
    const allDepsDone = deps.length === 0 || deps.every(d => nodeStates[d] === 'completed');

    if (allDepsDone) {
      ready.push(node.id);
    }
  }

  return Object.freeze(ready.sort());
}

export function getBlockedNodes(graph: ExecutionGraph, nodeStates: Readonly<Record<string, ExecutionState>>): readonly string[] {
  const blocked: string[] = [];

  for (const node of graph.nodes) {
    const state = nodeStates[node.id];
    if (state !== 'pending') continue;

    const deps = getDependencies(node.id, graph);
    const allDepsDone = deps.length === 0 || deps.every(d => nodeStates[d] === 'completed');

    if (!allDepsDone) {
      blocked.push(node.id);
    }
  }

  return Object.freeze(blocked.sort());
}

export function getFailedNodes(nodeStates: Readonly<Record<string, ExecutionState>>): readonly string[] {
  return Object.freeze(
    Object.entries(nodeStates)
      .filter(([_, state]) => state === 'failed')
      .map(([id]) => id)
      .sort(),
  );
}

export function getExecutionFrontier(graph: ExecutionGraph, nodeStates: Readonly<Record<string, ExecutionState>>): ExecutionFrontier {
  const ready = getReadyNodes(graph, nodeStates);
  const blocked = getBlockedNodes(graph, nodeStates);
  const completed = Object.freeze(
    Object.entries(nodeStates)
      .filter(([_, state]) => state === 'completed')
      .map(([id]) => id)
      .sort(),
  );
  const failed = getFailedNodes(nodeStates);
  const allDone = graph.nodes.every(n => nodeStates[n.id] === 'completed' || nodeStates[n.id] === 'failed' || nodeStates[n.id] === 'cancelled');

  return Object.freeze({ ready, blocked, completed, failed, allDone });
}
