import type { TraversalResult, TraversalStep } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { generateId, nowISO, computeHash } from '../utils/index.ts';
import { ReplayError } from '../errors/index.ts';

export class TraversalReplay {
  public static replayTraversal(traversal: TraversalResult, graph: GraphContract): TraversalResult {
    const replayedSteps: TraversalStep[] = [];
    for (const step of traversal.steps) {
      const node = graph.getNode(step.nodeId);
      if (!node) {
        throw new ReplayError(`Node ${step.nodeId} not found during replay`);
      }
      replayedSteps.push({ ...step });
    }
    const visitedSet = new Set(replayedSteps.map((s) => s.nodeId));
    const data = JSON.stringify({ strategy: traversal.strategy, steps: replayedSteps.map((s) => s.nodeId) });
    return {
      id: generateId('replay'),
      strategy: traversal.strategy,
      steps: replayedSteps,
      visited: visitedSet,
      depth: traversal.depth,
      nodeCount: visitedSet.size,
      startNode: traversal.startNode,
      endNode: traversal.endNode,
      duration: traversal.duration,
      status: 'COMPLETED',
      fingerprint: computeHash(data),
      timestamp: nowISO(),
    };
  }

  public static compareTraversals(
    original: TraversalResult,
    replayed: TraversalResult,
  ): { identical: boolean; differences: string[] } {
    const differences: string[] = [];
    if (original.strategy !== replayed.strategy) {
      differences.push(`strategy: ${original.strategy} vs ${replayed.strategy}`);
    }
    if (original.nodeCount !== replayed.nodeCount) {
      differences.push(`nodeCount: ${original.nodeCount} vs ${replayed.nodeCount}`);
    }
    if (original.steps.length !== replayed.steps.length) {
      differences.push(`steps length: ${original.steps.length} vs ${replayed.steps.length}`);
    }
    for (let i = 0; i < Math.min(original.steps.length, replayed.steps.length); i++) {
      if (original.steps[i]!.nodeId !== replayed.steps[i]!.nodeId) {
        differences.push(`step[${i}].nodeId: ${original.steps[i]!.nodeId} vs ${replayed.steps[i]!.nodeId}`);
      }
    }
    const origVisited = Array.from(original.visited).sort();
    const replVisited = Array.from(replayed.visited).sort();
    if (JSON.stringify(origVisited) !== JSON.stringify(replVisited)) {
      differences.push('visited sets differ');
    }
    return { identical: differences.length === 0, differences };
  }

  public static verifyFingerprint(traversal: TraversalResult): boolean {
    const data = JSON.stringify({ strategy: traversal.strategy, steps: traversal.steps.map((s) => s.nodeId) });
    const expected = computeHash(data);
    return expected === traversal.fingerprint;
  }
}
