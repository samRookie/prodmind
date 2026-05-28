import type { AntiPatternResult } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export interface GodModuleConfig {
  maxDependencies: number;
  maxFanOut: number;
  maxSize: number;
}

export const DEFAULT_GOD_MODULE_CONFIG: GodModuleConfig = {
  maxDependencies: 20,
  maxFanOut: 15,
  maxSize: 1000,
};

export interface NodeMetrics {
  id: string;
  dependencyCount: number;
  fanOut: number;
  size: number;
}

export function detectGodModules(
  nodes: NodeMetrics[],
  config: GodModuleConfig = DEFAULT_GOD_MODULE_CONFIG,
): AntiPatternResult[] {
  const results: AntiPatternResult[] = [];
  for (const node of nodes) {
    const violations: string[] = [];
    if (node.dependencyCount > config.maxDependencies) {
      violations.push(`Excessive dependencies: ${node.dependencyCount} > ${config.maxDependencies}`);
    }
    if (node.fanOut > config.maxFanOut) {
      violations.push(`Excessive fan-out: ${node.fanOut} > ${config.maxFanOut}`);
    }
    if (node.size > config.maxSize) {
      violations.push(`Excessive size: ${node.size} > ${config.maxSize}`);
    }
    if (violations.length > 0) {
      const violationRatio = violations.length / 3;
      const severity: InsightSeverity = violationRatio >= 0.66 ? 'CRITICAL' : violationRatio >= 0.33 ? 'HIGH' : 'MODERATE';
      const id = generateId('god-module');
      results.push({
        id,
        pattern: 'god-module',
        severity,
        confidence: 0.85 + violationRatio * 0.15,
        description: `Node ${node.id} exhibits god module characteristics: ${violations.join('; ')}`,
        nodes: [node.id],
        edges: [],
        metrics: {
          dependencyCount: node.dependencyCount,
          fanOut: node.fanOut,
          size: node.size,
        },
        evidence: [],
      });
    }
  }
  return results;
}
