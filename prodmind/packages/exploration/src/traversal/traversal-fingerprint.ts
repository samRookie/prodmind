import type { TraversalStep, NodeId } from '../types/index.ts';
import { computeHash, generateFingerprint } from '../utils/index.ts';

export class TraversalFingerprint {
  public static fromSteps(steps: TraversalStep[]): string {
    const parts = steps.map((s) => `${s.nodeId}:${s.depth}:${s.parentId ?? 'null'}:${s.edgeId ?? 'null'}`);
    return generateFingerprint(parts);
  }

  public static fromVisited(visited: ReadonlySet<NodeId>): string {
    const sorted = [...visited].sort();
    return computeHash(sorted.join(','));
  }

  public static fromSequence(nodeIds: NodeId[]): string {
    const parts = nodeIds.map((id, i) => `${i}:${id}`);
    return generateFingerprint(parts);
  }

  public static compare(a: string, b: string): boolean {
    return a === b;
  }
}
