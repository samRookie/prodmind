import type { TraversalResult, GraphQuery } from '../types/index.ts';
import { computeHash } from '../utils/index.ts';

export class ReplayValidator {
  public validateTraversalReplay(
    original: TraversalResult,
    replayed: TraversalResult,
  ): { valid: boolean; mismatches: string[] } {
    const mismatches: string[] = [];
    if (original.strategy !== replayed.strategy) {
      mismatches.push(
        `Strategy mismatch: ${original.strategy} vs ${replayed.strategy}`,
      );
    }
    if (original.startNode !== replayed.startNode) {
      mismatches.push(
        `StartNode mismatch: ${original.startNode} vs ${replayed.startNode}`,
      );
    }
    if (original.depth !== replayed.depth) {
      mismatches.push(
        `Depth mismatch: ${original.depth} vs ${replayed.depth}`,
      );
    }
    if (original.nodeCount !== replayed.nodeCount) {
      mismatches.push(
        `NodeCount mismatch: ${original.nodeCount} vs ${replayed.nodeCount}`,
      );
    }
    if (original.steps.length !== replayed.steps.length) {
      mismatches.push(
        `Steps length mismatch: ${original.steps.length} vs ${replayed.steps.length}`,
      );
    } else {
      for (let i = 0; i < original.steps.length; i++) {
        if (original.steps[i]!.nodeId !== replayed.steps[i]!.nodeId) {
          mismatches.push(
            `Step ${i} nodeId mismatch: ${original.steps[i]!.nodeId} vs ${replayed.steps[i]!.nodeId}`,
          );
        }
        if (original.steps[i]!.depth !== replayed.steps[i]!.depth) {
          mismatches.push(
            `Step ${i} depth mismatch: ${original.steps[i]!.depth} vs ${replayed.steps[i]!.depth}`,
          );
        }
      }
    }
    const visitedDiff = this.visitedDiff(original.visited, replayed.visited);
    if (visitedDiff.length > 0) {
      mismatches.push(`Visited sets differ: ${visitedDiff.join(', ')}`);
    }
    if (original.fingerprint !== replayed.fingerprint) {
      mismatches.push(
        `Fingerprint mismatch: ${original.fingerprint} vs ${replayed.fingerprint}`,
      );
    }
    return { valid: mismatches.length === 0, mismatches };
  }

  private visitedDiff(
    a: Set<string>,
    b: Set<string>,
  ): string[] {
    const diff: string[] = [];
    for (const item of a) {
      if (!b.has(item)) diff.push(`missing in replayed: ${item}`);
    }
    for (const item of b) {
      if (!a.has(item)) diff.push(`extra in replayed: ${item}`);
    }
    return diff;
  }

  public validateQueryReplay(
    original: GraphQuery,
    replayed: GraphQuery,
  ): { valid: boolean; mismatches: string[] } {
    const mismatches: string[] = [];
    if (original.target !== replayed.target) {
      mismatches.push(
        `Target mismatch: ${original.target} vs ${replayed.target}`,
      );
    }
    if (original.raw !== replayed.raw) {
      mismatches.push(`Raw query mismatch: "${original.raw}" vs "${replayed.raw}"`);
    }
    const origClauseStr = JSON.stringify(original.clauses);
    const replayClauseStr = JSON.stringify(replayed.clauses);
    if (origClauseStr !== replayClauseStr) {
      mismatches.push('Clauses differ');
    }
    const origParamStr = JSON.stringify(original.parameters);
    const replayParamStr = JSON.stringify(replayed.parameters);
    if (origParamStr !== replayParamStr) {
      mismatches.push('Parameters differ');
    }
    if (original.fingerprint !== replayed.fingerprint) {
      mismatches.push(
        `Fingerprint mismatch: ${original.fingerprint} vs ${replayed.fingerprint}`,
      );
    }
    return { valid: mismatches.length === 0, mismatches };
  }

  public validateFingerprintConsistency(traversal: TraversalResult): boolean {
    const stepStr = traversal.steps
      .map((s) => `${s.nodeId}:${s.depth}`)
      .join('|');
    const expected = `${traversal.id}|${traversal.strategy}|${traversal.startNode}|${traversal.nodeCount}|${traversal.depth}|${stepStr}`;
    const computed = computeHash(expected);
    return computed === traversal.fingerprint;
  }
}
