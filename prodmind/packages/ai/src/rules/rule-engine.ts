import type { Rule, RuleEvaluationContext, RuleEngineOutput, RuleFinding } from './rule-types.ts';
import { RuleRegistry } from './rule-registry.ts';
import { RuleRuntime } from './rule-runtime.ts';
import { fingerprintInsight } from '../insights/insight-fingerprint.ts';

export class RuleEngine {
  private readonly registry: RuleRegistry;
  private readonly runtime: RuleRuntime;

  constructor() {
    this.registry = new RuleRegistry();
    this.runtime = new RuleRuntime();
  }

  getRegistry(): RuleRegistry {
    return this.registry;
  }

  evaluate(ctx: RuleEvaluationContext): RuleEngineOutput {
    const rules = this.registry.getAll();
    return this.runtime.evaluate(rules, ctx);
  }

  evaluateWithRules(rules: Rule[], ctx: RuleEvaluationContext): RuleEngineOutput {
    return this.runtime.evaluate(rules, ctx);
  }

  findingsToInsights(findings: RuleFinding[]): {
    type: string;
    severity: string;
    scope: string;
    fingerprint: string;
    title: string;
    summary: string;
    evidence: { nodeId?: string; edgeId?: string; metricType?: string; metricValue?: number; description: string }[];
    metadata: Record<string, unknown>;
  }[] {
    return findings.map((f) => ({
      type: f.category,
      severity: f.severity,
      scope: f.scope,
      fingerprint: fingerprintInsight({
        type: f.category,
        severity: f.severity,
        scope: f.scope,
        title: f.title,
        summary: f.summary,
        evidence: f.evidence,
        metadata: f.metadata as Record<string, unknown>,
      }),
      title: f.title,
      summary: f.summary,
      evidence: f.evidence,
      metadata: f.metadata as Record<string, unknown>,
    }));
  }
}
