import type { TraversalResult, GraphQuery, TraversalStep } from '../types/index.ts';
import { ReplayMismatchError } from '../errors/index.ts';

export class ReplayValidator {
  public validateTraversal(original: TraversalResult, replayed: TraversalResult): boolean {
    if (original.strategy !== replayed.strategy) {
      throw new ReplayMismatchError(original.strategy, replayed.strategy);
    }
    if (original.steps.length !== replayed.steps.length) {
      throw new ReplayMismatchError(
        `steps(${original.steps.length})`,
        `steps(${replayed.steps.length})`,
      );
    }
    for (let i = 0; i < original.steps.length; i++) {
      if (original.steps[i]!.nodeId !== replayed.steps[i]!.nodeId) {
        throw new ReplayMismatchError(
          `step[${i}].nodeId=${original.steps[i]!.nodeId}`,
          `step[${i}].nodeId=${replayed.steps[i]!.nodeId}`,
        );
      }
    }
    return true;
  }

  public validateQuery(original: GraphQuery, replayed: GraphQuery): boolean {
    if (original.target !== replayed.target) {
      throw new ReplayMismatchError(original.target, replayed.target);
    }
    const origClauses = JSON.stringify(original.clauses);
    const replClauses = JSON.stringify(replayed.clauses);
    if (origClauses !== replClauses) {
      throw new ReplayMismatchError('clauses differ', origClauses);
    }
    return true;
  }

  public validateTraversalSteps(stepsA: TraversalStep[], stepsB: TraversalStep[]): boolean {
    if (stepsA.length !== stepsB.length) {
      throw new ReplayMismatchError(
        `steps(${stepsA.length})`,
        `steps(${stepsB.length})`,
      );
    }
    for (let i = 0; i < stepsA.length; i++) {
      if (stepsA[i]!.nodeId !== stepsB[i]!.nodeId || stepsA[i]!.depth !== stepsB[i]!.depth) {
        throw new ReplayMismatchError(
          `step[${i}] ${JSON.stringify(stepsA[i])}`,
          `step[${i}] ${JSON.stringify(stepsB[i])}`,
        );
      }
    }
    return true;
  }

  public validateOrdering(original: string[], replayed: string[]): boolean {
    if (original.length !== replayed.length) {
      throw new ReplayMismatchError(
        `length(${original.length})`,
        `length(${replayed.length})`,
      );
    }
    for (let i = 0; i < original.length; i++) {
      if (original[i] !== replayed[i]) {
        throw new ReplayMismatchError(`[${i}]=${original[i]}`, `[${i}]=${replayed[i]}`);
      }
    }
    return true;
  }
}
