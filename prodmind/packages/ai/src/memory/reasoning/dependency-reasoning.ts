import { ReasoningChain, type ChainResult } from './reasoning-chain.ts';
import { DependencyIndexer } from '../indexing/dependency-indexer.ts';

export class DependencyReasoning {
  private readonly _dependencyIndexer: DependencyIndexer;

  constructor(dependencyIndexer: DependencyIndexer) {
    this._dependencyIndexer = dependencyIndexer;
  }

  findCycles(nodeIds: readonly string[]): ChainResult {
    const chain = new ReasoningChain('cyclic_dependency');
    const cycles = this._detectCycles(nodeIds);

    chain.addStep(`Analyzing ${nodeIds.length} nodes for cyclic dependencies`, nodeIds, 1.0);

    if (cycles.length === 0) {
      chain.addStep('No cyclic dependencies detected', [], 1.0);
      return chain.build('Dependency graph is acyclic — safe for topological processing');
    }

    for (let i = 0; i < Math.min(cycles.length, 5); i++) {
      const cycle = cycles[i]!;
      chain.addStep(`Cycle ${i + 1}: ${cycle.join(' → ')}`, cycle, 0.9);
    }

    if (cycles.length > 5) {
      chain.addStep(`... and ${cycles.length - 5} more cycles`, [], 0.7);
    }

    return chain.build(`Detected ${cycles.length} cyclic dependencies — these may cause processing issues`);
  }

  analyzeStability(nodeIds: readonly string[]): ChainResult {
    const chain = new ReasoningChain('instability_escalation');

    const stabilityData = nodeIds.map(id => ({
      id,
      fanIn: this._dependencyIndexer.getFanIn(id),
      fanOut: this._dependencyIndexer.getFanOut(id),
      instability: this._dependencyIndexer.getInstability(id),
    })).sort((a, b) => b.instability - a.instability);

    chain.addStep(`Analyzing stability for ${nodeIds.length} nodes`, nodeIds, 1.0);

    const unstable = stabilityData.filter(d => d.instability > 0.7);
    if (unstable.length > 0) {
      chain.addStep(
        `High-instability nodes: ${unstable.map(d => `${d.id} (${d.instability.toFixed(2)})`).join(', ')}`,
        unstable.map(d => d.id),
        0.9,
      );
    }

    const stable = stabilityData.filter(d => d.instability < 0.3);
    if (stable.length > 0) {
      chain.addStep(
        `Stable nodes: ${stable.map(d => `${d.id} (${d.instability.toFixed(2)})`).join(', ')}`,
        stable.map(d => d.id),
        0.8,
      );
    }

    const avgInstability = stabilityData.reduce((s, d) => s + d.instability, 0) / stabilityData.length;
    return chain.build(
      `Average instability: ${avgInstability.toFixed(2)}. ${avgInstability > 0.5 ? 'Architecture shows instability risk' : 'Architecture is relatively stable'}`,
    );
  }

  private _detectCycles(nodeIds: readonly string[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inPath = new Set<string>();

    const dfs = (current: string, path: string[]) => {
      if (inPath.has(current)) {
        const cycleStart = path.indexOf(current);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), current]);
        }
        return;
      }
      if (visited.has(current)) return;

      visited.add(current);
      inPath.add(current);
      path.push(current);

      const deps = this._dependencyIndexer.getDependencies(current);
      for (const dep of deps) {
        if (nodeIds.includes(dep)) {
          dfs(dep, path);
        }
      }

      path.pop();
      inPath.delete(current);
    };

    for (const id of nodeIds) {
      if (!visited.has(id)) dfs(id, []);
    }

    return cycles;
  }
}
