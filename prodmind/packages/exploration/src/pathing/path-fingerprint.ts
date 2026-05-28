import type { PathResult, NodeId } from '../types/index.ts';
import { generateFingerprint } from '../utils/index.ts';

export class PathFingerprint {
  public static compute(path: PathResult): string {
    return generateFingerprint(path.nodes);
  }

  public static compare(a: string, b: string): boolean {
    return a === b;
  }

  public static fromNodes(nodes: NodeId[]): string {
    return generateFingerprint(nodes);
  }
}
