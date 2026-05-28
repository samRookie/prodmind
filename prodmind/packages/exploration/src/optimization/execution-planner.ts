import type { QueryPlan } from '../types/index.ts';
import type { QueryNode } from '../query/graph-query-ast.ts';

export class ExecutionPlanner {
  public plan(ast: QueryNode): QueryPlan {
    const steps: string[] = [];
    steps.push(`resolve_target:${ast.target.value}`);
    for (const clause of ast.clauses) {
      steps.push(`apply_logic:${clause.operator}`);
      for (const condition of clause.conditions) {
        if (condition.type === 'condition') {
          steps.push(`filter:${condition.field}_${condition.operator}`);
        } else {
          steps.push(`sub_clause:${condition.operator}`);
        }
      }
    }
    for (const param of ast.parameters) {
      steps.push(`param:${param.key}=${String(param.value)}`);
    }
    const estimatedNodes = ast.parameters.find((p) => p.key === 'limit')
      ? (ast.parameters.find((p) => p.key === 'limit')!.value as number)
      : 100;
    return {
      steps,
      estimatedCost: steps.length * 5,
      estimatedNodes: estimatedNodes as number,
      estimatedDepth: (ast.parameters.find((p) => p.key === 'depth')?.value as number) ?? 3,
      parallelism: steps.length > 3,
    };
  }

  public estimateCost(plan: QueryPlan): number {
    return plan.estimatedCost;
  }

  public shouldParallelize(plan: QueryPlan): boolean {
    return plan.parallelism;
  }

  public splitWork(plan: QueryPlan): QueryPlan[] {
    if (!this.shouldParallelize(plan)) return [plan];
    const midpoint = Math.ceil(plan.steps.length / 2);
    const planA: QueryPlan = {
      steps: plan.steps.slice(0, midpoint),
      estimatedCost: plan.estimatedCost / 2,
      estimatedNodes: Math.ceil(plan.estimatedNodes / 2),
      estimatedDepth: plan.estimatedDepth,
      parallelism: false,
    };
    const planB: QueryPlan = {
      steps: plan.steps.slice(midpoint),
      estimatedCost: plan.estimatedCost / 2,
      estimatedNodes: Math.floor(plan.estimatedNodes / 2),
      estimatedDepth: plan.estimatedDepth,
      parallelism: false,
    };
    return [planA, planB];
  }
}
