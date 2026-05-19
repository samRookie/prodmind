import {
  MetricType,
  MetricScope,
  MetricPriority,
} from '@prodmind/contracts';
import type { SemanticType } from '@prodmind/contracts';
import type {
  MetricsInput,
  MetricsOutput,
  MetricRecord,
  CentralityResult,
  FanMetricsResult,
  CouplingDensityResult,
  InstabilityResult,
  PropagationRiskResult,
  DepthResult,
  ComplexityResult,
} from './metrics-types.ts';
import { createGraphAnalysisCache, type GraphAnalysisCache } from './graph-analysis-cache.ts';
import { computeCentrality } from './centrality.ts';
import { computeFanMetrics } from './fan-metrics.ts';
import { computeCouplingDensity } from './coupling-density.ts';
import { computeInstability } from './instability.ts';
import { computePropagationRisk } from './propagation-risk.ts';
import { computeComplexity } from './complexity.ts';
import { computeDepthAnalysis } from './depth-analysis.ts';
import { MetricsError } from './metrics-errors.ts';

function getSortedKeys<V>(map: Map<string, V>): string[] {
  return Array.from(map.keys()).sort();
}

function determinePriority(
  metricType: MetricType,
  metricValue: number,
  classification: string | null,
): MetricPriority {
  if (classification === 'CRITICAL' || classification === 'VOLATILE' || classification === 'HIGHLY_COMPLEX') {
    return MetricPriority.CRITICAL;
  }
  if (classification === 'HIGH' || classification === 'UNSTABLE' || classification === 'COMPLEX') {
    return MetricPriority.IMPORTANT;
  }
  if (metricValue === 0) return MetricPriority.LOW;
  if (metricType === MetricType.FAN_ANALYSIS && classification === 'LOW') return MetricPriority.LOW;
  return MetricPriority.IMPORTANT;
}

function flattenCentrality(
  results: CentralityResult[],
): MetricRecord[] {
  const records: MetricRecord[] = [];
  for (const r of results) {
    if (r.dependencyInfluenceScore === 0 && r.inDegree === 0 && r.outDegree === 0) continue;
    records.push({
      metricType: MetricType.CENTRALITY,
      metricScope: MetricScope.NODE,
      nodeId: r.nodeId,
      metricValue: r.dependencyInfluenceScore,
      metricClassification: null,
      metricPriority: determinePriority(MetricType.CENTRALITY, r.dependencyInfluenceScore, null),
      metadataJson: JSON.stringify({
        inDegree: r.inDegree,
        outDegree: r.outDegree,
        reachabilityCount: r.reachabilityCount,
        isUtilityHub: r.isUtilityHub,
      }),
    });
  }
  return records;
}

function flattenFanMetrics(results: FanMetricsResult[]): MetricRecord[] {
  const records: MetricRecord[] = [];
  const totalNodes = results.length;

  const thresholdCount = Math.max(10, Math.ceil(totalNodes * 0.3));
  const sorted = [...results].sort((a, b) => b.fanIn + b.fanOut - (a.fanIn + a.fanOut));
  const topNodes = new Set(sorted.slice(0, thresholdCount).map((r) => r.nodeId));

  for (const r of results) {
    if (r.fanLevel === 'LOW' && !topNodes.has(r.nodeId)) continue;

    records.push({
      metricType: MetricType.FAN_ANALYSIS,
      metricScope: MetricScope.NODE,
      nodeId: r.nodeId,
      metricValue: r.fanIn + r.fanOut,
      metricClassification: r.fanLevel,
      metricPriority: determinePriority(MetricType.FAN_ANALYSIS, r.fanIn + r.fanOut, r.fanLevel),
      metadataJson: JSON.stringify({
        fanIn: r.fanIn,
        fanOut: r.fanOut,
        concentration: r.concentration,
        isUtilityHotspot: r.isUtilityHotspot,
        isGodModule: r.isGodModule,
      }),
    });
  }
  return records;
}

function flattenCouplingDensity(result: CouplingDensityResult): MetricRecord[] {
  const records: MetricRecord[] = [];

  records.push({
    metricType: MetricType.COUPLING_DENSITY,
    metricScope: MetricScope.GLOBAL,
    nodeId: null,
    metricValue: result.globalDensity,
    metricClassification: result.globalDensity > 0.1 ? 'HIGH' : result.globalDensity > 0.05 ? 'MEDIUM' : 'LOW',
    metricPriority: MetricPriority.IMPORTANT,
    metadataJson: JSON.stringify({ clusterCount: result.clusterDensities.length, edgeConcentration: result.edgeConcentration }),
  });

  for (const cd of result.clusterDensities) {
    records.push({
      metricType: MetricType.COUPLING_DENSITY,
      metricScope: MetricScope.CLUSTER,
      nodeId: null,
      metricValue: cd.density,
      metricClassification: null,
      metricPriority: MetricPriority.IMPORTANT,
      metadataJson: JSON.stringify({ clusterName: cd.clusterName, nodeCount: cd.nodeCount }),
    });
  }

  return records;
}

function flattenInstability(results: InstabilityResult[]): MetricRecord[] {
  const records: MetricRecord[] = [];
  for (const r of results) {
    records.push({
      metricType: MetricType.INSTABILITY,
      metricScope: MetricScope.NODE,
      nodeId: r.nodeId,
      metricValue: r.instabilityScore,
      metricClassification: r.instabilityLevel,
      metricPriority: determinePriority(MetricType.INSTABILITY, r.instabilityScore, r.instabilityLevel),
      metadataJson: JSON.stringify({
        isUnstableInfrastructure: r.isUnstableInfrastructure,
        isVolatileCore: r.isVolatileCore,
        hasInversionRisk: r.hasInversionRisk,
      }),
    });
  }
  return records;
}

function flattenPropagationRisk(results: PropagationRiskResult[]): MetricRecord[] {
  const records: MetricRecord[] = [];
  for (const r of results) {
    const maxRisk = Math.max(r.propagationPressure, r.blastRadiusAmplification, r.cascadeEstimate);
    if (maxRisk === 0) continue;

    records.push({
      metricType: MetricType.PROPAGATION_RISK,
      metricScope: MetricScope.NODE,
      nodeId: r.nodeId,
      metricValue: maxRisk,
      metricClassification: maxRisk > 0.5 ? 'HIGH' : maxRisk > 0.2 ? 'MEDIUM' : 'LOW',
      metricPriority: maxRisk > 0.5 ? MetricPriority.CRITICAL : maxRisk > 0.2 ? MetricPriority.IMPORTANT : MetricPriority.LOW,
      metadataJson: JSON.stringify({
        propagationPressure: r.propagationPressure,
        blastRadiusAmplification: r.blastRadiusAmplification,
        cascadeEstimate: r.cascadeEstimate,
        isChokePoint: r.isChokePoint,
      }),
    });
  }
  return records;
}

function flattenComplexity(result: ComplexityResult): MetricRecord[] {
  const records: MetricRecord[] = [];

  records.push({
    metricType: MetricType.COMPLEXITY,
    metricScope: MetricScope.GLOBAL,
    nodeId: null,
    metricValue: result.finalScore,
    metricClassification: result.complexityLevel,
    metricPriority: MetricPriority.CRITICAL,
    metadataJson: JSON.stringify({
      densityScore: result.densityScore,
      entropyScore: result.entropyScore,
      fragmentationScore: result.fragmentationScore,
      cycleScore: result.cycleScore,
      depthScore: result.depthScore,
      edgeNodeRatio: result.edgeNodeRatio,
      sccDensity: result.sccDensity,
      architecturalEntropy: result.architecturalEntropy,
    }),
  });

  return records;
}

function flattenDepth(result: DepthResult): MetricRecord[] {
  const records: MetricRecord[] = [];

  records.push({
    metricType: MetricType.DEPTH,
    metricScope: MetricScope.GLOBAL,
    nodeId: null,
    metricValue: result.averageDepth,
    metricClassification: result.maxDepth > 10 ? 'HIGH' : result.maxDepth > 5 ? 'MEDIUM' : 'LOW',
    metricPriority: MetricPriority.IMPORTANT,
    metadataJson: JSON.stringify({
      maxDepth: result.maxDepth,
      hasExcessivelyDeepChains: result.hasExcessivelyDeepChains,
      layeringViolationCount: result.layeringViolations.length,
      depthBins: result.depthDistribution,
    }),
  });

  for (const v of result.layeringViolations) {
    records.push({
      metricType: MetricType.DEPTH,
      metricScope: MetricScope.NODE,
      nodeId: v.sourceId,
      metricValue: 1,
      metricClassification: 'VIOLATION',
      metricPriority: MetricPriority.CRITICAL,
      metadataJson: JSON.stringify({ targetId: v.targetId, reason: v.reason }),
    });
  }

  return records;
}

export class MetricsEngine {
  public analyze(input: MetricsInput): MetricsOutput {
    try {
      const semanticTypeMap = new Map<string, SemanticType>();
      if (input.semanticClassifications) {
        for (const c of input.semanticClassifications) {
          semanticTypeMap.set(c.nodeId, c.semanticType as SemanticType);
        }
      }

      const cache: GraphAnalysisCache = createGraphAnalysisCache(
        input.nodes,
        input.edges,
        input.snapshotId,
        semanticTypeMap,
      );

      const centrality = computeCentrality(cache);
      const fanMetrics = computeFanMetrics(cache);
      const couplingDensity = computeCouplingDensity(cache);
      const instability = computeInstability(cache);
      const propagationRisk = computePropagationRisk(cache);
      const depth = computeDepthAnalysis(cache);
      const complexity = computeComplexity(cache);

      const records: MetricRecord[] = [
        ...flattenCentrality(centrality),
        ...flattenFanMetrics(fanMetrics),
        ...flattenCouplingDensity(couplingDensity),
        ...flattenInstability(instability),
        ...flattenPropagationRisk(propagationRisk),
        ...flattenDepth(depth),
        ...flattenComplexity(complexity),
      ];

      const sortedRecords = records.sort((a, b) => {
        const typeOrder = getSortedKeys(
          new Map([...MetricType.CENTRALITY, MetricType.FAN_ANALYSIS, MetricType.COUPLING_DENSITY, MetricType.INSTABILITY, MetricType.PROPAGATION_RISK, MetricType.DEPTH, MetricType.COMPLEXITY].map((t) => [t, true])),
        );
        const ti = typeOrder.indexOf(a.metricType as unknown as string);
        const tj = typeOrder.indexOf(b.metricType as unknown as string);
        if (ti !== tj) return ti - tj;

        const scopeOrder = [MetricScope.GLOBAL, MetricScope.CLUSTER, MetricScope.NODE];
        const si = scopeOrder.indexOf(a.metricScope);
        const sj = scopeOrder.indexOf(b.metricScope);
        if (si !== sj) return si - sj;

        return (a.nodeId ?? '').localeCompare(b.nodeId ?? '');
      });

      return {
        snapshotId: input.snapshotId,
        centrality,
        fanMetrics,
        couplingDensity,
        instability,
        propagationRisk,
        depth,
        complexity,
        records: sortedRecords,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      throw new MetricsError(
        err instanceof Error ? err.message : 'Metrics analysis failed',
      );
    }
  }
}
