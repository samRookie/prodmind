import { ValidationSeverity, ValidationCategory } from '@prodmind/contracts';
import type { ValidationContext, ValidationIssue } from './validation-types.ts';

function makeIssue(
  code: string, severity: ValidationSeverity, message: string,
  nodeId: string | null = null,
): ValidationIssue {
  return { issueCode: code, severity, category: ValidationCategory.RETRIEVAL, message, nodeId, edgeId: null, metadataJson: null };
}

export function validateNeighborhoodTraversal(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const startId of ctx.nodeMap.keys()) {
    const visited = new Set<string>();
    const stack = [startId];
    visited.add(startId);

    while (stack.length > 0) {
      const current = stack.pop()!;
      const neighbors = ctx.adjacency.get(current) ?? [];

      for (const neighbor of neighbors) {
        if (neighbor === current) continue;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    if (visited.size < 3 && ctx.nodeMap.size > 5) {
      issues.push(makeIssue('LOW_TRAVERSAL_COVERAGE', ValidationSeverity.INFO,
        `Node ${startId} reaches only ${visited.size} nodes out of ${ctx.nodeMap.size}`, startId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateDepthBoundaries(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const startId of ctx.nodeMap.keys()) {
    const visited = new Map<string, number>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
    visited.set(startId, 0);

    for (let i = 0; i < queue.length; i++) {
      const { id, depth } = queue[i]!;
      const neighbors = ctx.adjacency.get(id) ?? [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const newDepth = depth + 1;
          visited.set(neighbor, newDepth);
          queue.push({ id: neighbor, depth: newDepth });
        }
      }
    }

    const maxDepth = Math.max(...visited.values());
    if (maxDepth > 100) {
      issues.push(makeIssue('EXCESSIVE_TRAVERSAL_DEPTH', ValidationSeverity.WARNING,
        `Node ${startId} has traversal depth ${maxDepth} (recommended max: 100)`, startId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateRetrievalDeterminism(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const startId of ctx.nodeMap.keys()) {
    const run1 = deterministicTraversal(ctx, startId);
    const run2 = deterministicTraversal(ctx, startId);

    if (run1.length !== run2.length) {
      issues.push(makeIssue('NON_DETERMINISTIC_TRAVERSAL', ValidationSeverity.CRITICAL,
        `Traversal from ${startId} produced different result sizes across runs: ${run1.length} vs ${run2.length}`, startId));
      return issues;
    }

    for (let i = 0; i < run1.length; i++) {
      if (run1[i] !== run2[i]) {
        issues.push(makeIssue('NON_DETERMINISTIC_ORDERING', ValidationSeverity.ERROR,
          `Traversal from ${startId} produced different ordering at position ${i}: ${run1[i]} vs ${run2[i]}`, startId));
        return issues;
      }
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

function deterministicTraversal(ctx: ValidationContext, startId: string): string[] {
  const visited = new Set<string>();
  const result: string[] = [];
  const stack = [startId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);

    const neighbors = [...(ctx.adjacency.get(current) ?? [])].sort();
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighbor = neighbors[i]!;
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return result;
}

export function validateBlastRadiusConsistency(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const startId of ctx.nodeMap.keys()) {
    const forwardSize = countReachable(ctx, startId, 'forward');
    const backwardSize = countReachable(ctx, startId, 'backward');

    if (forwardSize > ctx.nodeMap.size * 0.8) {
      issues.push(makeIssue('HIGH_BLAST_RADIUS', ValidationSeverity.INFO,
        `Node ${startId} has forward blast radius covering ${((forwardSize / ctx.nodeMap.size) * 100).toFixed(0)}% of graph`, startId));
    }

    if (backwardSize > ctx.nodeMap.size * 0.8) {
      issues.push(makeIssue('HIGH_IMPACT_RADIUS', ValidationSeverity.INFO,
        `Node ${startId} has backward impact radius covering ${((backwardSize / ctx.nodeMap.size) * 100).toFixed(0)}% of graph`, startId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

function countReachable(ctx: ValidationContext, startId: string, direction: 'forward' | 'backward'): number {
  const visited = new Set<string>();
  const stack = [startId];
  visited.add(startId);

  while (stack.length > 0) {
    const current = stack.pop()!;
    const neighbors = direction === 'forward'
      ? (ctx.adjacency.get(current) ?? [])
      : (ctx.reverseAdjacency.get(current) ?? []);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
  }

  return visited.size;
}

export function validateRetrievalOrdering(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const startId of ctx.nodeMap.keys()) {
    const sorted = [...(ctx.adjacency.get(startId) ?? [])].sort();
    const unsorted = ctx.adjacency.get(startId) ?? [];

    let isStable = true;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== unsorted[i]) { isStable = false; break; }
    }

    if (!isStable) {
      issues.push(makeIssue('UNSTABLE_NEIGHBOR_ORDERING', ValidationSeverity.WARNING,
        `Neighbor ordering for node ${startId} is not deterministic`, startId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateCacheConsistency(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const nodeId of ctx.nodeMap.keys()) {
    const fwdList = ctx.adjacency.get(nodeId);

    if (fwdList) {
      for (const targetId of fwdList) {
        if (!ctx.nodeMap.has(targetId)) {
          issues.push(makeIssue('CACHE_NODE_MISMATCH', ValidationSeverity.CRITICAL,
            `Adjacency cache has node ${targetId} for ${nodeId} but node does not exist in graph`, nodeId));
        }
      }
    }

    const edgeLookup = ctx.adjacencyEdge.get(nodeId);
    if (edgeLookup && fwdList) {
      for (const targetId of fwdList) {
        const found = edgeLookup.get(targetId);
        if (!found) {
          issues.push(makeIssue('CACHE_EDGE_MISMATCH', ValidationSeverity.WARNING,
            `Adjacency has ${nodeId} -> ${targetId} but edge cache has no entry`, nodeId));
        }
      }
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateRetrievalStructure(ctx: ValidationContext): ValidationIssue[] {
  return [
    ...validateNeighborhoodTraversal(ctx),
    ...validateDepthBoundaries(ctx),
    ...validateRetrievalDeterminism(ctx),
    ...validateBlastRadiusConsistency(ctx),
    ...validateRetrievalOrdering(ctx),
    ...validateCacheConsistency(ctx),
  ];
}
