import type { ExecutionGraph } from '../contracts/execution-contracts.ts';

export interface LimitsConfig {
  readonly maxNodes?: number;
  readonly maxDepth?: number;
  readonly maxFanout?: number;
  readonly nodeTimeoutMs?: number;
}

export interface LimitsCheckResult {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
}

export class ExecutionLimits {
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxFanout: number;
  readonly nodeTimeoutMs: number;

  constructor(config?: LimitsConfig) {
    this.maxNodes = config?.maxNodes ?? 100;
    this.maxDepth = config?.maxDepth ?? 20;
    this.maxFanout = config?.maxFanout ?? 10;
    this.nodeTimeoutMs = config?.nodeTimeoutMs ?? 30000;
  }

  checkGraph(graph: ExecutionGraph): LimitsCheckResult {
    const reasons: string[] = [];

    if (graph.nodes.length > this.maxNodes) {
      reasons.push(`Graph has ${graph.nodes.length} nodes, exceeds max of ${this.maxNodes}`);
    }

    const depth = this.computeDepth(graph);
    if (depth > this.maxDepth) {
      reasons.push(`Graph depth is ${depth}, exceeds max of ${this.maxDepth}`);
    }

    for (const node of graph.nodes) {
      const fanout = this.computeFanout(node.id, graph);
      if (fanout > this.maxFanout) {
        reasons.push(`Node "${node.id}" has fanout ${fanout}, exceeds max of ${this.maxFanout}`);
      }
    }

    return Object.freeze({
      allowed: reasons.length === 0,
      reasons: Object.freeze(reasons),
    });
  }

  private computeDepth(graph: ExecutionGraph): number {
    const depths: Record<string, number> = {};
    const sorted = [...graph.nodes];

    for (const node of sorted) {
      const deps = node.dependencies;
      if (deps.length === 0) {
        depths[node.id] = 0;
      } else {
        let maxDep = -1;
        for (const dep of deps) {
          const d = depths[dep];
          if (d !== undefined && d > maxDep) maxDep = d;
        }
        depths[node.id] = maxDep + 1;
      }
    }

    const allDepths = Object.values(depths);
    return allDepths.length > 0 ? Math.max(...allDepths) : 0;
  }

  private computeFanout(nodeId: string, graph: ExecutionGraph): number {
    let count = 0;
    for (const edge of graph.edges) {
      if (edge.source === nodeId) count++;
    }
    for (const node of graph.nodes) {
      if (node.dependencies.includes(nodeId)) count++;
    }
    return count;
  }
}
