import type { Rule, RuleEvaluationContext, RuleEngineOutput } from './rule-types.ts';
import { RuleExecutor } from './rule-executor.ts';

export class RuleRuntime {
  private readonly executor: RuleExecutor;

  constructor(maxFindings = 1000) {
    this.executor = new RuleExecutor(maxFindings);
  }

  evaluate(
    rules: Rule[],
    ctx: RuleEvaluationContext,
  ): RuleEngineOutput {
    this.executor.reset();

    const sortedRules = [...rules].sort((a, b) => {
      const pri = a.priority - b.priority;
      if (pri !== 0) return pri;
      return a.id.localeCompare(b.id);
    });

    const results = this.executor.executeBatch(sortedRules, ctx);

    let totalTriggered = 0;
    let totalFindings = 0;
    for (const r of results) {
      if (r.triggered) totalTriggered++;
      totalFindings += r.findings.length;
    }

    return {
      snapshotId: ctx.snapshotId,
      results,
      totalTriggered,
      totalFindings,
    };
  }
}
