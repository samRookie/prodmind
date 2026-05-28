import type { RuleAction, RuleEvaluationContext, RuleFinding } from './rule-types.ts';

function resolveTemplate(template: string, params: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

function gatherContextParams(ctx: RuleEvaluationContext): Record<string, string> {
  return {
    snapshotId: ctx.snapshotId,
    nodeCount: String(ctx.nodes.length),
    edgeCount: String(ctx.edges.length),
    sccCount: String(ctx.sccData.componentCount),
    maxDepth: String(ctx.depth.maxDepth),
    avgDepth: String(ctx.depth.averageDepth.toFixed(2)),
    globalDensity: String(ctx.couplingDensity.globalDensity.toFixed(4)),
    complexityScore: String(ctx.complexity.finalScore.toFixed(3)),
    complexityLevel: ctx.complexity.complexityLevel,
  };
}

export function executeAction(
  action: RuleAction,
  ctx: RuleEvaluationContext,
  ruleId: string,
  ruleName: string,
): RuleFinding[] {
  const findings: RuleFinding[] = [];
  const baseParams = gatherContextParams(ctx);

  const { insight } = action;

  const params: Record<string, string> = { ...baseParams };
  if (insight.metadataTemplate) {
    for (const [key, tmpl] of Object.entries(insight.metadataTemplate)) {
      params[key] = tmpl;
    }
  }

  const evidenceRefs = action.evidence.map((et) => {
    const ref: { nodeId?: string; edgeId?: string; metricType?: string; metricValue?: number; description: string } = {
      description: resolveTemplate(et.descriptionTemplate, params),
    };
    if (et.nodeId) ref.nodeId = et.nodeId;
    if (et.edgeId) ref.edgeId = et.edgeId;
    if (et.metricType) ref.metricType = et.metricType;
    if (et.metricValue !== undefined) ref.metricValue = et.metricValue;
    return ref;
  });

  const title = resolveTemplate(insight.titleTemplate, params);
  const summary = resolveTemplate(insight.summaryTemplate, params);

  const metadata: Record<string, unknown> = {};
  if (insight.metadataTemplate) {
    for (const [key, tmpl] of Object.entries(insight.metadataTemplate)) {
      metadata[key] = resolveTemplate(tmpl, params);
    }
  }
  metadata.ruleId = ruleId;

  const finding: RuleFinding = {
    ruleId,
    ruleName,
    category: insight.type,
    severity: insight.severity,
    scope: insight.scope,
    title,
    summary,
    evidence: evidenceRefs,
    metadata,
  };

  findings.push(finding);
  return findings;
}
