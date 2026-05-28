import type { ComplexityInsight } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';
import { computeNormalizedEntropy, interpretEntropy } from './entropy-analysis.ts';
import { analyzeFragmentation } from './fragmentation-analysis.ts';
import { analyzeGraphComplexity } from './graph-complexity-analysis.ts';

export class ComplexityInterpreter {
  interpret(params: {
    nodeCount: number;
    edgeCount: number;
    degrees: number[];
    sccSizes: number[];
    componentSizes: number[];
    isolatedCount: number;
  }): ComplexityInsight[] {
    const insights: ComplexityInsight[] = [];
    const complexity = analyzeGraphComplexity(params.nodeCount, params.edgeCount, params.degrees, params.sccSizes);
    const entropy = computeNormalizedEntropy(params.degrees, params.nodeCount);
    const entropyInfo = interpretEntropy(entropy);
    const fragMetrics = analyzeFragmentation(params.componentSizes, params.nodeCount, params.isolatedCount);

    const densitySev: InsightSeverity = complexity.density > 0.5 ? 'HIGH' : complexity.density > 0.3 ? 'MODERATE' : 'LOW';
    insights.push({
      id: generateId('complexity-density'),
      metric: 'graph-density',
      value: complexity.density,
      threshold: 0.3,
      severity: densitySev,
      description: `Graph density: ${complexity.density.toFixed(3)} (nodes: ${complexity.nodeCount}, edges: ${complexity.edgeCount})`,
      trend: 'stable',
      regions: [],
    });
    insights.push({
      id: generateId('complexity-entropy'),
      metric: 'graph-entropy',
      value: entropy,
      threshold: 0.5,
      severity: entropy > 0.8 ? 'HIGH' : entropy > 0.5 ? 'MODERATE' : 'LOW',
      description: entropyInfo.description,
      trend: 'stable',
      regions: [],
    });
    insights.push({
      id: generateId('complexity-fragmentation'),
      metric: 'fragmentation',
      value: fragMetrics.fragmentationIndex,
      threshold: 0.2,
      severity: fragMetrics.fragmentationIndex > 0.5 ? 'HIGH' : fragMetrics.fragmentationIndex > 0.2 ? 'MODERATE' : 'LOW',
      description: `${fragMetrics.componentCount} components, ${fragMetrics.isolatedNodes} isolated, index ${fragMetrics.fragmentationIndex.toFixed(3)}`,
      trend: 'stable',
      regions: [],
    });
    return insights;
  }
}
