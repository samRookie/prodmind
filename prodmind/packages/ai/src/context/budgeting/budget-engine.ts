import type { ContextBudget,ContextSlice } from '../contracts.ts';
import { createContextBudget } from '../contracts.ts';
import { BudgetExceededError } from '../errors.ts';

export interface BudgetResult {
  readonly slices: readonly ContextSlice[];
  readonly budget: ContextBudget;
  readonly discarded: readonly string[];
}

export class BudgetEngine {
  enforce(
    slices: ContextSlice[],
    hardLimit: number,
    softLimit: number,
    reserved: number,
  ): BudgetResult {
    const totalTokenEstimate = slices.reduce((sum, s) => sum + s.tokenCount, 0);
    const available = hardLimit - reserved;

    if (totalTokenEstimate === 0) {
      const budget = createContextBudget({
        total: 0, used: 0, reserved, hardLimit, softLimit,
      });
      return { slices: Object.freeze([...slices]), budget, discarded: [] };
    }

    if (available <= 0) {
      throw new BudgetExceededError(hardLimit, totalTokenEstimate);
    }

    const sorted = this.prioritizeSlices(slices);
    const trimmed: ContextSlice[] = [];
    const discarded: string[] = [];
    let usedTokens = 0;

    for (const slice of sorted) {
      const sliceTokens = slice.tokenCount;
      const wouldExceedSoft = usedTokens + sliceTokens > softLimit;
      const wouldExceedHard = usedTokens + sliceTokens > available;

      if (wouldExceedHard) {
        discarded.push(slice.id);
      } else if (wouldExceedSoft && !this.isCriticalSlice(slice)) {
        const trimmedSlice = this.trimSlice(slice, available - usedTokens);
        if (trimmedSlice.nodes.length > 0) {
          trimmed.push(trimmedSlice);
          usedTokens += trimmedSlice.tokenCount;
        } else {
          discarded.push(slice.id);
        }
      } else {
        trimmed.push(slice);
        usedTokens += sliceTokens;
      }
    }

    const budget = createContextBudget({
      total: totalTokenEstimate,
      used: usedTokens,
      reserved,
      hardLimit,
      softLimit,
    });

    return {
      slices: Object.freeze(trimmed),
      budget,
      discarded: Object.freeze(discarded),
    };
  }

  estimateTokens(nodeCount: number, edgeCount: number): number {
    return (nodeCount * 20) + (edgeCount * 8);
  }

  private prioritizeSlices(slices: ContextSlice[]): ContextSlice[] {
    const priority: Record<string, number> = {
      risk_oriented: 10,
      architectural_boundary: 9,
      semantic_region: 8,
      local_neighborhood: 7,
      coupled_subsystem: 6,
      upstream_chain: 5,
      downstream_chain: 5,
      unstable_region: 4,
    };

    return [...slices].sort((a, b) => {
      const pa = priority[a.kind] ?? 0;
      const pb = priority[b.kind] ?? 0;
      if (pa !== pb) return pb - pa;
      return a.id.localeCompare(b.id);
    });
  }

  private isCriticalSlice(slice: ContextSlice): boolean {
    return (
      slice.kind === 'risk_oriented' ||
      slice.kind === 'architectural_boundary'
    );
  }

  private trimSlice(slice: ContextSlice, budget: number): ContextSlice {
    const nodeCost = 20;
    const maxNodes = Math.max(1, Math.floor(budget / nodeCost));
    const trimmed = slice.nodes.slice(0, maxNodes);

    return Object.freeze({
      ...slice,
      nodes: Object.freeze(trimmed),
      tokenCount: trimmed.length * nodeCost,
      metadata: Object.freeze({
        ...slice.metadata,
        budgetTrimmed: true,
        originalNodeCount: slice.nodes.length,
      }),
    });
  }
}
