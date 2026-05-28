import type { PathResult } from '../types/index.ts';

export class PathComparator {
  public compare(pathA: PathResult, pathB: PathResult): { overlaps: string[]; differences: string[]; similarity: number } {
    const setA = new Set(pathA.nodes);
    const setB = new Set(pathB.nodes);
    const overlaps = pathA.nodes.filter((n) => setB.has(n));
    const differences = [
      ...pathA.nodes.filter((n) => !setB.has(n)),
      ...pathB.nodes.filter((n) => !setA.has(n)),
    ];
    const total = new Set([...pathA.nodes, ...pathB.nodes]).size;
    const similarity = total > 0 ? overlaps.length / total : 1;
    return { overlaps, differences, similarity };
  }

  public findCommonSegments(paths: PathResult[]): string[][] {
    if (paths.length < 2) return [];

    const segments = paths.map((p) => p.nodes);
    const common: string[][] = [];
    const base = segments[0]!;

    for (let i = 0; i < base.length; i++) {
      for (let j = i + 1; j <= base.length; j++) {
        const candidate = base.slice(i, j);
        if (candidate.length < 2) continue;
        if (segments.every((s) => this.containsSubsequence(s, candidate))) {
          common.push(candidate);
        }
      }
    }

    return common;
  }

  public rankByRisk(paths: PathResult[]): PathResult[] {
    return [...paths].sort((a, b) => b.riskScore - a.riskScore);
  }

  public rankByLength(paths: PathResult[]): PathResult[] {
    return [...paths].sort((a, b) => a.nodeCount - b.nodeCount);
  }

  private containsSubsequence(sequence: string[], subsequence: string[]): boolean {
    let si = 0;
    for (const item of sequence) {
      if (item === subsequence[si]) si++;
      if (si === subsequence.length) return true;
    }
    return false;
  }
}
