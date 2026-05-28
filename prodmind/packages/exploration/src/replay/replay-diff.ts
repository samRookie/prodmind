import type { TraversalResult, TraversalStep, NodeId } from '../types/index.ts';

export class ReplayDiff {
  public static diffTraversals(
    a: TraversalResult,
    b: TraversalResult,
  ): {
    added: NodeId[];
    removed: NodeId[];
    reordered: boolean;
    stepDifferences: Array<{ index: number; expected: TraversalStep; actual: TraversalStep }>;
  } {
    const visitedA = new Set(a.steps.map((s) => s.nodeId));
    const visitedB = new Set(b.steps.map((s) => s.nodeId));
    const added: NodeId[] = [];
    const removed: NodeId[] = [];
    for (const nodeId of visitedB) {
      if (!visitedA.has(nodeId)) added.push(nodeId);
    }
    for (const nodeId of visitedA) {
      if (!visitedB.has(nodeId)) removed.push(nodeId);
    }
    const stepDifferences: Array<{ index: number; expected: TraversalStep; actual: TraversalStep }> = [];
    const maxLen = Math.max(a.steps.length, b.steps.length);
    for (let i = 0; i < maxLen; i++) {
      const stepA = a.steps[i];
      const stepB = b.steps[i];
      if (!stepA || !stepB || stepA.nodeId !== stepB.nodeId || stepA.depth !== stepB.depth) {
        if (stepA && stepB) {
          stepDifferences.push({ index: i, expected: stepA, actual: stepB });
        }
      }
    }
    const orderA = a.steps.map((s) => s.nodeId);
    const orderB = b.steps.map((s) => s.nodeId);
    const reordered = JSON.stringify(orderA) !== JSON.stringify(orderB);
    return { added, removed, reordered, stepDifferences };
  }

  public static diffNodeOrders(
    a: NodeId[],
    b: NodeId[],
  ): { added: NodeId[]; removed: NodeId[]; reordered: boolean } {
    const setA = new Set(a);
    const setB = new Set(b);
    const added: NodeId[] = [];
    const removed: NodeId[] = [];
    for (const nodeId of setB) {
      if (!setA.has(nodeId)) added.push(nodeId);
    }
    for (const nodeId of setA) {
      if (!setB.has(nodeId)) removed.push(nodeId);
    }
    const reordered = JSON.stringify(a) !== JSON.stringify(b);
    return { added, removed, reordered };
  }
}
