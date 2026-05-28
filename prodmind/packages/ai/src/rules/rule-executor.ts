import type { Rule, RuleEvaluationContext, RuleExecutionResult, RuleFinding } from './rule-types.ts';
import { evaluateAllConditions } from './rule-conditions.ts';
import { executeAction } from './rule-actions.ts';
import { fingerprintInsight } from '../insights/insight-fingerprint.ts';

function buildFindingFingerprint(finding: RuleFinding): string {
  return fingerprintInsight({
    type: finding.category,
    severity: finding.severity,
    scope: finding.scope,
    title: finding.title,
    summary: finding.summary,
    evidence: finding.evidence,
    metadata: finding.metadata as Record<string, unknown>,
  });
}

export class RuleExecutor {
  private readonly seenFingerprints: Set<string> = new Set();
  private readonly maxFindings: number;
  private readonly maxRecursionPrevention: Set<string> = new Set();

  constructor(maxFindings = 1000) {
    this.maxFindings = maxFindings;
  }

  execute(
    rule: Rule,
    ctx: RuleEvaluationContext,
  ): RuleExecutionResult {
    const startTime = performance.now();

    if (this.maxRecursionPrevention.has(rule.id)) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        triggered: false,
        findings: [],
        executionTimeMs: 0,
      };
    }
    this.maxRecursionPrevention.add(rule.id);

    const conditionsMet = evaluateAllConditions(rule.conditions, ctx);

    let findings: RuleFinding[] = [];
    let triggered = false;

    if (conditionsMet) {
      triggered = true;
      const rawFindings = executeAction(rule.action, ctx, rule.id, rule.name);

      for (const finding of rawFindings) {
        if (findings.length >= this.maxFindings) break;

        const fp = buildFindingFingerprint(finding);
        if (!this.seenFingerprints.has(fp)) {
          this.seenFingerprints.add(fp);
          finding.metadata.fingerprint = fp;
          findings.push(finding);
        }
      }
    }

    const endTime = performance.now();

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      triggered,
      findings,
      executionTimeMs: Math.round((endTime - startTime) * 100) / 100,
    };
  }

  executeBatch(
    rules: Rule[],
    ctx: RuleEvaluationContext,
  ): RuleExecutionResult[] {
    this.maxRecursionPrevention.clear();

    const results: RuleExecutionResult[] = [];
    for (const rule of rules) {
      const result = this.execute(rule, ctx);
      results.push(result);
    }

    return results;
  }

  reset(): void {
    this.seenFingerprints.clear();
    this.maxRecursionPrevention.clear();
  }
}
