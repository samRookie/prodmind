import type { ExecutionGraph } from './execution-contracts.ts';

export interface GraphValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateGraph(graph: ExecutionGraph): GraphValidationResult {
  const errors: string[] = [];

  if (!graph.id) {
    errors.push('Graph must have an id');
  }

  const nodeIds = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      duplicateIds.add(node.id);
    }
    nodeIds.add(node.id);
  }

  if (duplicateIds.size > 0) {
    const dups = Array.from(duplicateIds).sort();
    errors.push(`Duplicate node ids: ${dups.join(', ')}`);
  }

  for (let i = 0; i < graph.edges.length; i++) {
    const edge = graph.edges[i]!;

    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge[${i}]: source "${edge.source}" references unknown node`);
    }

    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge[${i}]: target "${edge.target}" references unknown node`);
    }

    if (edge.source === edge.target) {
      errors.push(`Edge[${i}]: self-loop detected (${edge.source} → ${edge.target})`);
    }
  }

  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i]!;
    for (let j = 0; j < node.dependencies.length; j++) {
      const dep = node.dependencies[j]!;
      if (!nodeIds.has(dep)) {
        errors.push(`Node "${node.id}": dependency "${dep}" references unknown node`);
      }
    }
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
  });
}
