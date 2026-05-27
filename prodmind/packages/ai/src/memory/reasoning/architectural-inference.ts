import type { ArchitecturalFinding, MemoryEntry } from '../contracts/memory-contracts.ts';
import { ReasoningChain, type ChainResult } from './reasoning-chain.ts';

export interface InferenceRule {
  readonly pattern: string;
  readonly condition: (entries: readonly MemoryEntry[], findings: readonly ArchitecturalFinding[]) => boolean;
  readonly conclusion: string;
}

export class ArchitecturalInference {
  private readonly _rules: InferenceRule[] = [];

  addRule(rule: InferenceRule): void {
    this._rules.push(rule);
  }

  infer(entries: readonly MemoryEntry[], findings: readonly ArchitecturalFinding[]): readonly ChainResult[] {
    const results: ChainResult[] = [];

    for (const rule of this._rules) {
      if (rule.condition(entries, findings)) {
        const chain = new ReasoningChain('architectural_drift');
        chain.addStep(`Pattern matched: ${rule.pattern}`, findings.map(f => f.id), 0.8);
        results.push(chain.build(rule.conclusion));
      }
    }

    return Object.freeze(results);
  }

  inferDensityChange(previousNodes: number, currentNodes: number, previousEdges: number, currentEdges: number): ChainResult | undefined {
    const nodeGrowth = currentNodes - previousNodes;
    const edgeGrowth = currentEdges - previousEdges;

    if (nodeGrowth <= 0 && edgeGrowth <= 0) return undefined;

    const chain = new ReasoningChain('architectural_drift');
    chain.addStep(`Node count changed: ${previousNodes} → ${currentNodes} (Δ${nodeGrowth})`, [], 1.0);
    chain.addStep(`Edge count changed: ${previousEdges} → ${currentEdges} (Δ${edgeGrowth})`, [], 1.0);

    const ratio = edgeGrowth / Math.max(1, nodeGrowth);
    const conclusion = ratio > 2
      ? `High connectivity growth detected: edges growing ${ratio}x faster than nodes`
      : `Architecture growing at proportional rate (nodes: ${nodeGrowth}, edges: ${edgeGrowth})`;

    return chain.build(conclusion);
  }

  inferHotspot(entries: readonly MemoryEntry[], threshold: number): readonly ChainResult[] {
    const byTag = new Map<string, number>();
    for (const entry of entries) {
      for (const tag of entry.tags) {
        byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
      }
    }

    const results: ChainResult[] = [];
    for (const [tag, count] of byTag) {
      if (count >= threshold) {
        const chain = new ReasoningChain('architectural_drift');
        chain.addStep(`Tag "${tag}" appears ${count} times (threshold: ${threshold})`, [], 0.9);
        results.push(chain.build(`Hotspot detected: "${tag}" with ${count} references`));
      }
    }

    return Object.freeze(results);
  }

  get rules(): readonly InferenceRule[] {
    return Object.freeze([...this._rules]);
  }

  clear(): void {
    this._rules.length = 0;
  }
}
