import { ValidationSeverity, ValidationCategory } from '@prodmind/contracts';
import type { ValidationContext, ValidationIssue } from './validation-types.ts';

function makeIssue(
  code: string, severity: ValidationSeverity, message: string,
  nodeId: string | null = null, edgeId: string | null = null,
): ValidationIssue {
  return { issueCode: code, severity, category: ValidationCategory.DEPENDENCY, message, nodeId, edgeId, metadataJson: null };
}

export function validateBrokenDependencyTargets(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const edge of ctx.edgeMap.values()) {
    if (!ctx.nodeMap.has(edge.targetNodeId)) {
      issues.push(makeIssue('BROKEN_DEP_TARGET', ValidationSeverity.CRITICAL,
        `Dependency from ${edge.sourceNodeId} targets missing node ${edge.targetNodeId}`, edge.sourceNodeId, edge.id));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateCircularDependencies(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = [...ctx.nodeMap.keys()].sort();
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();

  for (const id of nodeIds) color.set(id, WHITE);

  for (const startId of nodeIds) {
    if (color.get(startId) !== WHITE) continue;

    const adjList = ctx.adjacency.get(startId) ?? [];
    const stack: Array<{ nodeId: string; iter: Iterator<string> }> = [];
    const iter = adjList[Symbol.iterator]();
    color.set(startId, GRAY);
    stack.push({ nodeId: startId, iter });

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const next = frame.iter.next();

      if (next.done) {
        color.set(frame.nodeId, BLACK);
        stack.pop();
      } else {
        const neighbor = next.value;
        if (color.get(neighbor) === GRAY) {
          issues.push(makeIssue('CIRCULAR_DEPENDENCY', ValidationSeverity.ERROR,
            `Circular dependency: ${frame.nodeId} -> ${neighbor}`, frame.nodeId));
        } else if (color.get(neighbor) === WHITE) {
          color.set(neighbor, GRAY);
          const neighborIter = ctx.adjacency.get(neighbor)?.values() ?? [][Symbol.iterator]();
          stack.push({ nodeId: neighbor, iter: neighborIter[Symbol.iterator]?.() ?? [][Symbol.iterator]() });
        }
      }
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateDependencyDepthLimits(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const maxAllowedDepth = 50;

  for (const startId of ctx.nodeMap.keys()) {
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];
    visited.add(startId);
    let maxDepth = 0;

    for (let i = 0; i < queue.length; i++) {
      const { id, depth } = queue[i]!;
      const neighbors = ctx.adjacency.get(id) ?? [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const newDepth = depth + 1;
          if (newDepth > maxDepth) maxDepth = newDepth;
          queue.push({ id: neighbor, depth: newDepth });
        }
      }
    }

    if (maxDepth > maxAllowedDepth) {
      issues.push(makeIssue('EXCESSIVE_DEPTH', ValidationSeverity.WARNING,
        `Dependency chain from ${startId} reaches depth ${maxDepth} (max allowed: ${maxAllowedDepth})`, startId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateDependencyChains(ctx: ValidationContext): ValidationIssue[] {
  return validateDependencyDepthLimits(ctx);
}

export function validateAliasResolutionIntegrity(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const edge of ctx.edgeMap.values()) {
    if (edge.edgeType === 'ALIAS') {
      const target = ctx.nodeMap.get(edge.targetNodeId);
      if (!target) {
        issues.push(makeIssue('BROKEN_ALIAS_TARGET', ValidationSeverity.ERROR,
          `Alias edge ${edge.id} from ${edge.sourceNodeId} targets non-existent node ${edge.targetNodeId}`,
          edge.sourceNodeId, edge.id));
      }
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateReExportChains(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const startId of ctx.nodeMap.keys()) {
    const visited = new Set<string>();
    const stack = [startId];
    visited.add(startId);

    while (stack.length > 0) {
      const current = stack.pop()!;
      const neighbors = ctx.adjacency.get(current) ?? [];

      for (const neighbor of neighbors) {
        if (neighbor === startId && current !== startId) {
          issues.push(makeIssue('REEXPORT_CYCLE', ValidationSeverity.ERROR,
            `Re-export chain creates cycle: ${current} re-exports back to ${startId}`, startId));
          continue;
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateDependencyStructure(ctx: ValidationContext): ValidationIssue[] {
  return [
    ...validateBrokenDependencyTargets(ctx),
    ...validateCircularDependencies(ctx),
    ...validateDependencyDepthLimits(ctx),
    ...validateAliasResolutionIntegrity(ctx),
    ...validateReExportChains(ctx),
  ];
}
