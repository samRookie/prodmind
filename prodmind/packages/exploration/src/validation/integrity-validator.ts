import type {
  TraversalResult,
  GraphQuery,
  PathResult,
  Neighborhood,
} from '../types/index.ts';

export class IntegrityValidator {
  public validateTraversalIntegrity(
    traversal: TraversalResult,
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (traversal.steps.length !== traversal.nodeCount) {
      issues.push(
        `Step count (${traversal.steps.length}) does not match nodeCount (${traversal.nodeCount})`,
      );
    }
    if (traversal.visited.size !== traversal.nodeCount) {
      issues.push(
        `Visited count (${traversal.visited.size}) does not match nodeCount (${traversal.nodeCount})`,
      );
    }
    for (const step of traversal.steps) {
      if (!traversal.visited.has(step.nodeId)) {
        issues.push(`Step node ${step.nodeId} not in visited set`);
      }
    }
    if (traversal.endNode !== null && !traversal.visited.has(traversal.endNode)) {
      issues.push(`EndNode ${traversal.endNode} not in visited set`);
    }
    if (!traversal.fingerprint) {
      issues.push('Missing traversal fingerprint');
    }
    if (!traversal.timestamp) {
      issues.push('Missing traversal timestamp');
    }
    return { valid: issues.length === 0, issues };
  }

  public validateQueryIntegrity(
    query: GraphQuery,
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!query.id) issues.push('Missing query id');
    if (!query.fingerprint) issues.push('Missing query fingerprint');
    if (!query.target) issues.push('Missing query target');
    if (query.raw === undefined || query.raw === null) {
      issues.push('Missing raw query string');
    }
    if (!query.clauses || !query.clauses.conditions) {
      issues.push('Missing or invalid clauses');
    }
    return { valid: issues.length === 0, issues };
  }

  public validatePathIntegrity(
    path: PathResult,
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!path.nodes || path.nodes.length === 0) {
      issues.push('Path has no nodes');
    }
    if (!path.edges || path.edges.length === 0) {
      issues.push('Path has no edges');
    }
    if (path.nodeCount !== path.nodes.length) {
      issues.push(
        `nodeCount (${path.nodeCount}) does not match nodes length (${path.nodes.length})`,
      );
    }
    if (path.edgeCount !== path.edges.length) {
      issues.push(
        `edgeCount (${path.edgeCount}) does not match edges length (${path.edges.length})`,
      );
    }
    if (path.nodes.length > 0 && path.edges.length > 0) {
      if (path.nodes.length !== path.edges.length + 1) {
        issues.push(
          `Nodes (${path.nodes.length}) should be edges (${path.edges.length}) + 1`,
        );
      }
    }
    if (!path.fingerprint) {
      issues.push('Missing path fingerprint');
    }
    return { valid: issues.length === 0, issues };
  }

  public validateNeighborhoodIntegrity(
    neighborhood: Neighborhood,
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (!neighborhood.center) {
      issues.push('Missing neighborhood center');
    }
    if (!neighborhood.nodes || neighborhood.nodes.length === 0) {
      issues.push('Neighborhood has no nodes');
    }
    if (neighborhood.nodeCount !== neighborhood.nodes.length) {
      issues.push(
        `nodeCount (${neighborhood.nodeCount}) does not match nodes length (${neighborhood.nodes.length})`,
      );
    }
    if (neighborhood.edgeCount !== neighborhood.edges.length) {
      issues.push(
        `edgeCount (${neighborhood.edgeCount}) does not match edges length (${neighborhood.edges.length})`,
      );
    }
    if (neighborhood.center && !neighborhood.nodes.includes(neighborhood.center)) {
      issues.push(`Center node ${neighborhood.center} not in nodes list`);
    }
    if (neighborhood.radius < 0) {
      issues.push(`Invalid radius: ${neighborhood.radius}`);
    }
    if (neighborhood.density < 0 || neighborhood.density > 1) {
      issues.push(`Invalid density: ${neighborhood.density} (should be 0-1)`);
    }
    if (!neighborhood.fingerprint) {
      issues.push('Missing neighborhood fingerprint');
    }
    return { valid: issues.length === 0, issues };
  }
}
