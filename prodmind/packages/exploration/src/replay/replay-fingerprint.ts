import type { TraversalResult, GraphQuery } from '../types/index.ts';
import { computeHash } from '../utils/index.ts';

export class ReplayFingerprint {
  public static fromTraversal(traversal: TraversalResult): string {
    const sortedVisited = Array.from(traversal.visited).sort();
    const data = JSON.stringify({
      strategy: traversal.strategy,
      steps: traversal.steps.map((s) => s.nodeId),
      depth: traversal.depth,
      visited: sortedVisited,
    });
    return computeHash(data);
  }

  public static fromQuery(query: GraphQuery): string {
    const data = JSON.stringify({
      target: query.target,
      clauses: query.clauses,
      parameters: query.parameters,
    });
    return computeHash(data);
  }

  public static compare(a: string, b: string): boolean {
    return a === b;
  }

  public static verifyReplayChain(fingerprints: string[]): boolean {
    if (fingerprints.length < 2) return true;
    for (let i = 1; i < fingerprints.length; i++) {
      if (fingerprints[i] !== fingerprints[0]) {
        return false;
      }
    }
    return true;
  }
}
