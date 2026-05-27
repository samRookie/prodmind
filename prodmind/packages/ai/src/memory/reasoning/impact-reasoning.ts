import type { MemoryEntry } from '../contracts/memory-contracts.ts';
import { ReasoningChain, type ChainResult } from './reasoning-chain.ts';
import { DependencyIndexer } from '../indexing/dependency-indexer.ts';

export class ImpactReasoning {
  private readonly _dependencyIndexer: DependencyIndexer;

  constructor(dependencyIndexer: DependencyIndexer) {
    this._dependencyIndexer = dependencyIndexer;
  }

  analyzeImpact(nodeId: string, entries: readonly MemoryEntry[]): ChainResult {
    const chain = new ReasoningChain('dependency_impact');
    const dependents = this._dependencyIndexer.getDependents(nodeId);
    const dependencies = this._dependencyIndexer.getDependencies(nodeId);

    chain.addStep(`Analyzing impact of "${nodeId}"`, [nodeId], 1.0);
    chain.addStep(`Has ${dependents.length} dependents`, dependents, 0.9);
    chain.addStep(`Depends on ${dependencies.length} modules`, dependencies, 0.9);

    const fanOut = this._dependencyIndexer.getFanOut(nodeId);
    const fanIn = this._dependencyIndexer.getFanIn(nodeId);
    const instability = this._dependencyIndexer.getInstability(nodeId);

    chain.addStep(`Fan-in: ${fanIn}, Fan-out: ${fanOut}, Instability: ${instability.toFixed(3)}`, [], 0.8);

    const relatedEntries = entries.filter(e =>
      dependents.includes(e.id) || dependencies.includes(e.id),
    );
    chain.addStep(`Found ${relatedEntries.length} related memory entries`, relatedEntries.map(e => e.id), 0.7);

    let conclusion: string;
    if (fanOut > 10 && instability > 0.7) {
      conclusion = `"${nodeId}" is high-risk: affects ${fanOut} dependents with instability ${instability.toFixed(2)}`;
    } else if (fanIn > 10) {
      conclusion = `"${nodeId}" is widely depended upon (${fanIn} reverse dependencies) — changes require careful review`;
    } else {
      conclusion = `"${nodeId}" has moderate impact (fan-out: ${fanOut}, instability: ${instability.toFixed(2)})`;
    }

    return chain.build(conclusion);
  }

  analyzePropagationRisk(seedIds: readonly string[], maxDepth: number): ChainResult {
    const chain = new ReasoningChain('propagation_risk');
    const visited = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = seedIds.map(id => ({ id, depth: 0 }));
    const propagationChain: string[] = [];

    for (const seed of seedIds) {
      visited.add(seed);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= maxDepth) continue;

      const dependents = this._dependencyIndexer.getDependents(current.id);
      for (const depId of dependents) {
        if (!visited.has(depId)) {
          visited.add(depId);
          propagationChain.push(`${current.id} → ${depId}`);
          queue.push({ id: depId, depth: current.depth + 1 });
        }
      }
    }

    chain.addStep(`Starting propagation analysis from ${seedIds.length} seeds`, seedIds, 1.0);
    chain.addStep(`Reaches ${visited.size - seedIds.length} nodes across ${maxDepth} levels`, [...visited], 0.9);

    if (propagationChain.length > 0) {
      chain.addStep(`Propagation paths: ${propagationChain.slice(0, 10).join(', ')}${propagationChain.length > 10 ? `... (${propagationChain.length - 10} more)` : ''}`, propagationChain, 0.8);
    }

    const conclusion = visited.size - seedIds.length > 10
      ? `High propagation risk: changes to seeds affect ${visited.size - seedIds.length} downstream nodes`
      : `Limited propagation risk: changes affect ${visited.size - seedIds.length} nodes`;

    return chain.build(conclusion);
  }
}
