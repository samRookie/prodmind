import { ValidationSeverity, ValidationCategory } from '@prodmind/contracts';
import type { ValidationContext, ValidationIssue, GraphValidationResult } from './validation-types.ts';

function makeIssue(
  code: string, severity: ValidationSeverity, message: string,
  nodeId: string | null = null, edgeId: string | null = null,
): ValidationIssue {
  return { issueCode: code, severity, category: ValidationCategory.GRAPH_STRUCTURE, message, nodeId, edgeId, metadataJson: null };
}

export function validateNodeReferences(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(ctx.nodeMap.keys());

  for (const edge of ctx.edgeMap.values()) {
    if (!nodeIds.has(edge.sourceNodeId)) {
      issues.push(makeIssue('NODE_REF_MISSING_SOURCE', ValidationSeverity.CRITICAL,
        `Edge ${edge.id} references missing source node ${edge.sourceNodeId}`, null, edge.id));
    }
    if (!nodeIds.has(edge.targetNodeId)) {
      issues.push(makeIssue('NODE_REF_MISSING_TARGET', ValidationSeverity.CRITICAL,
        `Edge ${edge.id} references missing target node ${edge.targetNodeId}`, null, edge.id));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateEdgeReferences(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const edge of ctx.edgeMap.values()) {
    if (edge.sourceNodeId === edge.targetNodeId) {
      issues.push(makeIssue('EDGE_SELF_REFERENCE', ValidationSeverity.WARNING,
        `Edge ${edge.id} is a self-reference from ${edge.sourceNodeId} to itself`, edge.sourceNodeId, edge.id));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateDuplicateEdges(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, string[]>();

  for (const edge of ctx.edgeMap.values()) {
    const key = `${edge.sourceNodeId}->${edge.targetNodeId}`;
    const existing = seen.get(key);
    if (existing) {
      existing.push(edge.id);
      issues.push(makeIssue('DUPLICATE_EDGE', ValidationSeverity.ERROR,
        `Duplicate edge from ${edge.sourceNodeId} to ${edge.targetNodeId}: edges ${existing.join(', ')}`,
        edge.sourceNodeId, edge.id));
    } else {
      seen.set(key, [edge.id]);
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateDuplicateNodes(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, string[]>();

  for (const node of ctx.nodeMap.values()) {
    const existing = seen.get(node.id);
    if (existing) {
      existing.push(node.filePath);
      issues.push(makeIssue('DUPLICATE_NODE', ValidationSeverity.ERROR,
        `Duplicate node id ${node.id} at paths: ${existing.join(', ')}`, node.id));
    } else {
      seen.set(node.id, [node.filePath]);
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateOrphanNodes(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const connected = new Set<string>();

  for (const edge of ctx.edgeMap.values()) {
    connected.add(edge.sourceNodeId);
    connected.add(edge.targetNodeId);
  }

  for (const nodeId of ctx.nodeMap.keys()) {
    if (!connected.has(nodeId)) {
      issues.push(makeIssue('ORPHAN_NODE', ValidationSeverity.WARNING,
        `Node ${nodeId} (${ctx.nodeMap.get(nodeId)?.filePath ?? ''}) has no edges`, nodeId));
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateBrokenRegions(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const visited = new Set<string>();
  const nodeIds = [...ctx.nodeMap.keys()].sort();
  let regionCount = 0;

  for (const startId of nodeIds) {
    if (visited.has(startId)) continue;

    regionCount++;
    const stack = [startId];
    visited.add(startId);

    while (stack.length > 0) {
      const current = stack.pop()!;
      const fwd = ctx.adjacency.get(current) ?? [];
      const rev = ctx.reverseAdjacency.get(current) ?? [];

      for (const neighbor of [...fwd, ...rev]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
  }

  if (regionCount > 1) {
    issues.push(makeIssue('DISCONNECTED_REGIONS', ValidationSeverity.WARNING,
      `Graph has ${regionCount} disconnected regions. Expected 1 fully connected graph`));
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateCycleCorrectness(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = [...ctx.nodeMap.keys()].sort();
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  let cycleCount = 0;

  for (const id of nodeIds) color.set(id, WHITE);

  for (const startId of nodeIds) {
    if (color.get(startId) !== WHITE) continue;

    const adjList = ctx.adjacency.get(startId) ?? [];
    const stack: Array<{ nodeId: string; iterator: Iterator<string> }> = [];
    const iter = adjList[Symbol.iterator]();
    color.set(startId, GRAY);
    parent.set(startId, null);
    stack.push({ nodeId: startId, iterator: iter });

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const next = frame.iterator.next();

      if (next.done) {
        color.set(frame.nodeId, BLACK);
        stack.pop();
      } else {
        const neighbor = next.value;
        if (color.get(neighbor) === GRAY) {
          cycleCount++;
          issues.push(makeIssue('CYCLE_DETECTED', ValidationSeverity.ERROR,
            `Cycle detected involving edge ${frame.nodeId} -> ${neighbor}`, frame.nodeId));
        } else if (color.get(neighbor) === WHITE) {
          color.set(neighbor, GRAY);
          parent.set(neighbor, frame.nodeId);
          const neighborIter = ctx.adjacency.get(neighbor)?.values() ?? [][Symbol.iterator]();
          stack.push({ nodeId: neighbor, iterator: neighborIter[Symbol.iterator]?.() ?? [][Symbol.iterator]() });
        }
      }
    }
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateGraphConnectivity(ctx: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const totalNodes = ctx.nodeMap.size;
  const visited = new Set<string>();
  const nodeIds = [...ctx.nodeMap.keys()].sort();

  if (nodeIds.length === 0) return [];

  const startId = nodeIds[0]!;
  const stack = [startId];
  visited.add(startId);

  while (stack.length > 0) {
    const current = stack.pop()!;
    const fwd = ctx.adjacency.get(current) ?? [];
    const rev = ctx.reverseAdjacency.get(current) ?? [];

    for (const neighbor of [...fwd, ...rev]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
  }

  if (visited.size < totalNodes) {
    const unreachable = totalNodes - visited.size;
    issues.push(makeIssue('GRAPH_NOT_FULLY_CONNECTED', ValidationSeverity.WARNING,
      `Graph has ${unreachable} unreachable nodes out of ${totalNodes} total`));
  }

  return issues.sort((a, b) => a.issueCode.localeCompare(b.issueCode));
}

export function validateGraphStructure(ctx: ValidationContext): GraphValidationResult {
  const nodeRefIssues = validateNodeReferences(ctx);
  const edgeRefIssues = validateEdgeReferences(ctx);
  const dupEdgeIssues = validateDuplicateEdges(ctx);
  const dupNodeIssues = validateDuplicateNodes(ctx);
  const orphanIssues = validateOrphanNodes(ctx);
  const regionIssues = validateBrokenRegions(ctx);
  const cycleIssues = validateCycleCorrectness(ctx);
  const connectivityIssues = validateGraphConnectivity(ctx);

  const allIssues = [
    ...nodeRefIssues, ...edgeRefIssues, ...dupEdgeIssues,
    ...dupNodeIssues, ...orphanIssues, ...regionIssues,
    ...cycleIssues, ...connectivityIssues,
  ];

  return {
    issues: allIssues,
    isConnected: connectivityIssues.length === 0,
    orphanNodeCount: orphanIssues.length,
    duplicateEdgeCount: dupEdgeIssues.length,
    duplicateNodeCount: dupNodeIssues.length,
    brokenRegionCount: regionIssues.length,
    cycleCount: cycleIssues.length,
  };
}
