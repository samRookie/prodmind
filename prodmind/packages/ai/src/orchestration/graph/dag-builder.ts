import type { ExecutionEdge,ExecutionGraph, ExecutionNode } from '../contracts/execution-contracts.ts';
import { createExecutionEdge, createExecutionGraph, createExecutionNode, generateExecutionId } from '../contracts/execution-factories.ts';
import { validateGraph } from '../contracts/execution-graph.ts';
import { hasCycle } from './cycle-detector.ts';

export interface DAGBuilderResult {
  readonly graph: ExecutionGraph;
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export class DAGBuilder {
  private readonly nodes: ExecutionNode[] = [];
  private readonly edges: ExecutionEdge[] = [];
  private graphId: string;

  constructor(graphId?: string) {
    this.graphId = graphId ?? generateExecutionId('dag');
  }

  setGraphId(id: string): this {
    this.graphId = id;
    return this;
  }

  addNode(input: {
    id: string;
    type: ExecutionNode['type'];
    label: string;
    config?: Record<string, unknown>;
    dependencies?: readonly string[];
  }): this {
    const node = createExecutionNode(input);
    this.nodes.push(node);
    return this;
  }

  addEdge(input: { source: string; target: string; condition?: string }): this {
    const edge = createExecutionEdge(input);
    this.edges.push(edge);
    return this;
  }

  build(): DAGBuilderResult {
    const errors: string[] = [];

    if (this.nodes.length === 0) {
      errors.push('Graph must have at least one node');
    }

    const nodeIds = new Set(this.nodes.map(n => n.id));

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i]!;
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references unknown source node "${edge.source}"`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references unknown target node "${edge.target}"`);
      }
    }

    if (errors.length > 0) {
      return Object.freeze({
        graph: createExecutionGraph({ id: this.graphId, nodes: [], edges: [] }),
        valid: false,
        errors: Object.freeze(errors),
      });
    }

    const graph = createExecutionGraph({
      id: this.graphId,
      nodes: this.nodes,
      edges: this.edges,
    });

    const validation = validateGraph(graph);
    if (!validation.valid) {
      return Object.freeze({
        graph,
        valid: false,
        errors: validation.errors,
      });
    }

    if (hasCycle(graph)) {
      return Object.freeze({
        graph,
        valid: false,
        errors: Object.freeze(['Graph contains a cycle']),
      });
    }

    return Object.freeze({
      graph,
      valid: true,
      errors: Object.freeze([]),
    });
  }
}
