export { MetricsEngine } from './metrics-engine.ts';
export type {
  MetricsInput,
  MetricsOutput,
  MetricsNode,
  MetricsEdge,
  MetricRecord,
  CentralityResult,
  FanMetricsResult,
  CouplingDensityResult,
  InstabilityResult,
  PropagationRiskResult,
  DepthResult,
  ComplexityResult,
} from './metrics-types.ts';

export {
  MetricType,
  MetricScope,
  MetricPriority,
  FanLevel,
  InstabilityLevel,
  ComplexityLevel,
} from '@prodmind/contracts';

export { computeCentrality } from './centrality.ts';
export { computeFanMetrics, classifyFanLevel, isUtilityHotspot, isGodModule } from './fan-metrics.ts';
export { computeCouplingDensity } from './coupling-density.ts';
export { computeInstability, classifyInstability } from './instability.ts';
export { computePropagationRisk } from './propagation-risk.ts';
export { computeComplexity } from './complexity.ts';
export { computeDepthAnalysis } from './depth-analysis.ts';

export { createGraphAnalysisCache } from './graph-analysis-cache.ts';
export type { GraphAnalysisCache, SCCResult } from './graph-analysis-cache.ts';

export {
  MetricsError,
  CentralityError,
  FanMetricsError,
  CouplingDensityError,
  InstabilityError,
  PropagationRiskError,
  ComplexityError,
  DepthAnalysisError,
} from './metrics-errors.ts';
