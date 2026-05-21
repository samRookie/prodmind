import type { ExecutionGraph, ExecutionNodeResult } from '../contracts/execution-contracts.ts';

export interface DataLineage {
  readonly nodeId: string;
  readonly inputs: Readonly<Record<string, string>>;
  readonly outputKeys: readonly string[];
  readonly dependencyOf: readonly string[];
  readonly dependedOn: readonly string[];
}

export class ProvenanceTracker {
  private lineage: Map<string, DataLineage> = new Map();
  private outputOwners: Map<string, string> = new Map();

  recordNodeOutput(nodeId: string, result: ExecutionNodeResult, graph: ExecutionGraph): void {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const inputs: Record<string, string> = {};
    for (const dep of node.dependencies) {
      inputs[dep] = dep;
    }

    const outputKeys = Object.keys(result.output);
    for (const key of outputKeys) {
      this.outputOwners.set(`${nodeId}.${key}`, nodeId);
    }

    const dependedOn = [...node.dependencies];
    const dependencyOf: string[] = [];
    for (const other of graph.nodes) {
      if (other.dependencies.includes(nodeId)) {
        dependencyOf.push(other.id);
      }
    }

    this.lineage.set(nodeId, Object.freeze({
      nodeId,
      inputs: Object.freeze(inputs),
      outputKeys: Object.freeze(outputKeys),
      dependencyOf: Object.freeze(dependencyOf.sort()),
      dependedOn: Object.freeze(dependedOn.sort()),
    }));
  }

  getLineage(nodeId: string): DataLineage | undefined {
    return this.lineage.get(nodeId);
  }

  getDownstream(nodeId: string): readonly string[] {
    const result: string[] = [];
    for (const [, lineage] of this.lineage) {
      if (lineage.dependedOn.includes(nodeId) || lineage.inputs[nodeId] !== undefined) {
        result.push(lineage.nodeId);
      }
    }
    return Object.freeze(result.sort());
  }

  getUpstream(nodeId: string): readonly string[] {
    const lineage = this.lineage.get(nodeId);
    if (!lineage) return Object.freeze([]);
    return Object.freeze([...lineage.dependedOn].sort());
  }

  getAll(): readonly DataLineage[] {
    return Object.freeze(Array.from(this.lineage.values()));
  }

  clear(): void {
    this.lineage.clear();
    this.outputOwners.clear();
  }
}
