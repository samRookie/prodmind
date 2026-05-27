import type { RetrievalQuery, RetrievalStrategy } from '../contracts/retrieval-query.ts';
import { createRetrievalQuery } from '../contracts/memory-factories.ts';

export interface ExpansionStep {
  readonly depth: number;
  readonly strategy: RetrievalStrategy;
  readonly budget: number;
  readonly seedCount: number;
}

export interface RetrievalPlan {
  readonly query: RetrievalQuery;
  readonly steps: readonly ExpansionStep[];
  readonly totalBudget: number;
  readonly maxDepth: number;
}

export interface PlannerOptions {
  readonly maxDepth?: number;
  readonly maxResults?: number;
  readonly stepBudget?: number;
  readonly namespace?: string;
  readonly strategies?: readonly string[];
}

const DEFAULT_OPTIONS: PlannerOptions = Object.freeze({
  maxDepth: 5,
  maxResults: 50,
  stepBudget: 10,
  strategies: ['exact', 'namespace', 'dependency', 'provenance', 'hybrid'],
});

export class RetrievalPlanner {
  private readonly _options: PlannerOptions;

  constructor(options?: PlannerOptions) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  plan(seedIds: readonly string[], options?: Partial<PlannerOptions>): RetrievalPlan {
    const opts = { ...this._options, ...options };
    const maxDepth = opts.maxDepth ?? 5;
    const strategies = (opts.strategies ?? ['exact', 'namespace', 'dependency', 'provenance', 'hybrid']) as readonly RetrievalStrategy[];
    const stepBudget = opts.stepBudget ?? 10;

    const steps: ExpansionStep[] = [];
    let totalBudget = 0;

    for (let depth = 0; depth <= maxDepth; depth++) {
      const strategy = strategies[Math.min(depth, strategies.length - 1)]!;
      const budget = Math.max(1, stepBudget - depth);
      steps.push({ depth, strategy, budget, seedCount: seedIds.length });
      totalBudget += budget;
    }

    const query = createRetrievalQuery({
      seedIds,
      maxDepth,
      maxResults: opts.maxResults ?? 50,
      namespace: opts.namespace,
      strategy: 'hybrid',
    });

    return Object.freeze({
      query,
      steps: Object.freeze(steps),
      totalBudget,
      maxDepth,
    });
  }

  expand(plan: RetrievalPlan, newSeeds: readonly string[]): RetrievalPlan {
    const merged = [...new Set([...plan.query.seedIds, ...newSeeds])];
    return this.plan(merged, {
      maxDepth: plan.maxDepth,
      maxResults: plan.query.maxResults,
      namespace: plan.query.namespace,
    });
  }

  contract(plan: RetrievalPlan, budget: number): RetrievalPlan {
    const maxDepth = Math.max(1, Math.floor(budget / 10));
    return this.plan(plan.query.seedIds, {
      maxDepth,
      maxResults: Math.min(plan.query.maxResults, budget),
      namespace: plan.query.namespace,
    });
  }
}
