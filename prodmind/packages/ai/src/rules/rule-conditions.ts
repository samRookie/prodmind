import type { RuleCondition, RuleEvaluationContext, MetricOperator } from './rule-types.ts';

function evaluateMetricOperator(
  actual: number,
  operator: MetricOperator,
  threshold: number,
): boolean {
  switch (operator) {
    case 'GT': return actual > threshold;
    case 'GTE': return actual >= threshold;
    case 'LT': return actual < threshold;
    case 'LTE': return actual <= threshold;
    case 'EQ': return Math.abs(actual - threshold) < 0.001;
  }
}

function evalMetricThreshold(
  condition: RuleCondition & { type: 'METRIC_THRESHOLD' },
  ctx: RuleEvaluationContext,
): boolean {
  const { metricType, operator, value, scope } = condition;

  const allMetrics: { nodeId?: string; value: number; metricType: string }[] = [];

  for (const m of ctx.metrics.centrality) {
    allMetrics.push({ nodeId: m.nodeId, value: m.dependencyInfluenceScore, metricType: 'CENTRALITY' });
  }
  for (const m of ctx.metrics.fanMetrics) {
    allMetrics.push({ nodeId: m.nodeId, value: m.fanIn + m.fanOut, metricType: 'FAN_ANALYSIS' });
  }
  for (const m of ctx.metrics.instability) {
    allMetrics.push({ nodeId: m.nodeId, value: m.instabilityScore, metricType: 'INSTABILITY' });
  }
  for (const m of ctx.metrics.propagationRisk) {
    allMetrics.push({ nodeId: m.nodeId, value: Math.max(m.propagationPressure, m.blastRadiusAmplification, m.cascadeEstimate), metricType: 'PROPAGATION_RISK' });
  }

  allMetrics.push({ nodeId: undefined, value: ctx.complexity.finalScore, metricType: 'COMPLEXITY' });
  allMetrics.push({ nodeId: undefined, value: ctx.couplingDensity.globalDensity, metricType: 'COUPLING_DENSITY' });

  const matched = allMetrics.filter((m) => m.metricType === metricType || metricType === 'ANY');

  if (scope === 'GLOBAL') {
    const avg = matched.reduce((s, m) => s + m.value, 0) / Math.max(matched.length, 1);
    return evaluateMetricOperator(avg, operator, value);
  }

  return matched.some((m) => evaluateMetricOperator(m.value, operator, value));
}

function evalGraphPredicate(
  condition: RuleCondition & { type: 'GRAPH_PREDICATE' },
  ctx: RuleEvaluationContext,
): boolean {
  switch (condition.predicate) {
    case 'HAS_EDGES':
      return ctx.edges.length > 0;
    case 'HAS_NODES':
      return ctx.nodes.length > 0;
    case 'HAS_CYCLES':
      return ctx.sccData.componentCount > 0 && [...ctx.sccData.componentNodes.values()].some((n) => n.length > 1);
    case 'HAS_MULTI_NODE_SCC':
      return [...ctx.sccData.componentNodes.values()].some((n) => n.length > 1);
    case 'EDGE_COUNT_GT': {
      const threshold = (condition.params?.threshold as number) ?? 0;
      return ctx.edges.length > threshold;
    }
    case 'NODE_COUNT_GT': {
      const threshold = (condition.params?.threshold as number) ?? 0;
      return ctx.nodes.length > threshold;
    }
    default:
      return false;
  }
}

function evalSemanticPredicate(
  condition: RuleCondition & { type: 'SEMANTIC_PREDICATE' },
  ctx: RuleEvaluationContext,
): boolean {
  if (!ctx.semanticClassifications) return false;

  switch (condition.predicate) {
    case 'HAS_SEMANTIC_TYPE': {
      const strength = condition.minStrength ?? 0;
      return ctx.semanticClassifications.some(
        (c) => c.semanticType === condition.semanticType && Number(c.ruleStrength) >= strength,
      );
    }
    case 'HAS_INFRA_LAYER':
      return ctx.semanticClassifications.some((c) => c.semanticType === 'INFRASTRUCTURE');
    case 'HAS_BUSINESS_LAYER':
      return ctx.semanticClassifications.some((c) => c.semanticType === 'BUSINESS_LOGIC');
    default:
      return false;
  }
}

function evalSCCPredicate(
  condition: RuleCondition & { type: 'SCC_PREDICATE' },
  ctx: RuleEvaluationContext,
): boolean {
  switch (condition.predicate) {
    case 'HAS_SCC':
      return ctx.sccData.componentCount > 0;
    case 'HAS_LARGE_SCC': {
      const minSize = condition.minComponentSize ?? 3;
      return [...ctx.sccData.componentNodes.values()].some((n) => n.length >= minSize);
    }
    case 'SCC_COUNT_GT': {
      const threshold = condition.minComponentSize ?? 1;
      return ctx.sccData.componentCount > threshold;
    }
    default:
      return false;
  }
}

function evalTopologyPredicate(
  condition: RuleCondition & { type: 'TOPOLOGY_PREDICATE' },
  ctx: RuleEvaluationContext,
): boolean {
  switch (condition.predicate) {
    case 'HAS_DEEP_CHAINS':
      return ctx.depth.hasExcessivelyDeepChains;
    case 'HAS_LAYERING_VIOLATIONS':
      return ctx.depth.layeringViolations.length > 0;
    case 'HAS_CHOKE_POINTS':
      return ctx.metrics.propagationRisk.some((p) => p.isChokePoint);
    case 'HAS_GOD_MODULES':
      return ctx.metrics.fanMetrics.some((f) => f.isGodModule);
    case 'HAS_UTILITY_HOTSPOTS':
      return ctx.metrics.fanMetrics.some((f) => f.isUtilityHotspot);
    case 'IS_FRAGMENTED': {
      const threshold = (condition.params?.clusterThreshold as number) ?? 5;
      return ctx.couplingDensity.clusterDensities.length > threshold;
    }
    default:
      return false;
  }
}

export function evaluateCondition(
  condition: RuleCondition,
  ctx: RuleEvaluationContext,
): boolean {
  switch (condition.type) {
    case 'METRIC_THRESHOLD':
      return evalMetricThreshold(condition, ctx);
    case 'GRAPH_PREDICATE':
      return evalGraphPredicate(condition, ctx);
    case 'SEMANTIC_PREDICATE':
      return evalSemanticPredicate(condition, ctx);
    case 'SCC_PREDICATE':
      return evalSCCPredicate(condition, ctx);
    case 'TOPOLOGY_PREDICATE':
      return evalTopologyPredicate(condition, ctx);
    default:
      return false;
  }
}

export function evaluateAllConditions(
  conditions: RuleCondition[],
  ctx: RuleEvaluationContext,
): boolean {
  for (const condition of conditions) {
    if (!evaluateCondition(condition, ctx)) return false;
  }
  return true;
}
