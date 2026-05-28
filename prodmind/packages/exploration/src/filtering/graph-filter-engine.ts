import type { GraphNode, GraphEdge, FilterComposition } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { NodeFilter } from './node-filter.ts';
import { EdgeFilter } from './edge-filter.ts';
import { SemanticFilter } from './semantic-filter.ts';
import { MetricFilter } from './metric-filter.ts';
import { StructuralFilter } from './structural-filter.ts';
import { FilterComposer } from './filter-composition.ts';

export interface FilterConfig {
  type: 'NODE' | 'EDGE' | 'SEMANTIC' | 'METRIC' | 'STRUCTURAL';
  field?: string;
  operator?: string;
  value?: unknown;
  filter?: (item: GraphNode | GraphEdge) => boolean;
}

export class GraphFilterEngine {
  private graph: GraphContract;
  private nodeFilter: NodeFilter;
  private edgeFilter: EdgeFilter;
  private semanticFilter: SemanticFilter;
  private metricFilter: MetricFilter;
  private structuralFilter: StructuralFilter;
  constructor(graph: GraphContract) {
    this.graph = graph;
    this.nodeFilter = new NodeFilter();
    this.edgeFilter = new EdgeFilter();
    this.semanticFilter = new SemanticFilter(graph);
    this.metricFilter = new MetricFilter();
    this.structuralFilter = new StructuralFilter(graph);
  }

  public apply(
    filters: FilterConfig[],
    composition?: FilterComposition,
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const allNodes = this.graph.getAllNodes();
    const allEdges = this.graph.getEdgesForNode('*').length > 0
      ? this.getAllEdges()
      : [];

    const results: Array<{ nodes: GraphNode[]; edges: GraphEdge[] }> = [];

    for (const filter of filters) {
      results.push(this.applySingleFilter(filter, allNodes, allEdges));
    }

    if (results.length === 0) return { nodes: allNodes, edges: allEdges };
    if (results.length === 1) return results[0]!;

    const operators: FilterComposition[] = [];
    for (let i = 0; i < results.length - 1; i++) {
      operators.push(composition ?? 'AND');
    }

    return FilterComposer.compose(operators, results);
  }

  public filterNodes(filters: FilterConfig[]): GraphNode[] {
    const result = this.apply(filters);
    return result.nodes;
  }

  public filterEdges(filters: FilterConfig[]): GraphEdge[] {
    const result = this.apply(filters);
    return result.edges;
  }

  public reset(): void {
  }

  private applySingleFilter(
    filter: FilterConfig,
    allNodes: GraphNode[],
    allEdges: GraphEdge[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    if (filter.filter) {
      return {
        nodes: allNodes.filter((n) => filter.filter!(n)),
        edges: allEdges.filter((e) => filter.filter!(e)),
      };
    }

    switch (filter.type) {
      case 'NODE':
        return this.applyNodeFilter(filter, allNodes, allEdges);
      case 'EDGE':
        return this.applyEdgeFilter(filter, allNodes, allEdges);
      case 'SEMANTIC':
        return this.applySemanticFilter(filter, allNodes, allEdges);
      case 'METRIC':
        return this.applyMetricFilter(filter, allNodes, allEdges);
      case 'STRUCTURAL':
        return this.applyStructuralFilter(filter, allNodes, allEdges);
      default:
        return { nodes: allNodes, edges: allEdges };
    }
  }

  private applyNodeFilter(
    filter: FilterConfig,
    allNodes: GraphNode[],
    _allEdges: GraphEdge[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    let filtered = allNodes;

    if (filter.field && filter.operator && filter.value !== undefined) {
      filtered = this.nodeFilter.byProperty(filtered, filter.field, filter.operator as never, filter.value);
    } else if (filter.field === 'type' && filter.value !== undefined) {
      filtered = this.nodeFilter.byType(filtered, String(filter.value));
    }

    return { nodes: filtered, edges: [] };
  }

  private applyEdgeFilter(
    filter: FilterConfig,
    _allNodes: GraphNode[],
    allEdges: GraphEdge[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    let filtered = allEdges;

    if (filter.field === 'weight' && filter.operator === 'IN_RANGE' && Array.isArray(filter.value)) {
      filtered = this.edgeFilter.byWeight(filtered, (filter.value[0] as number), (filter.value[1] as number));
    } else if (filter.field && filter.operator && filter.value !== undefined) {
      filtered = this.edgeFilter.byProperty(filtered, filter.field, filter.operator as never, filter.value);
    } else if (filter.field === 'type' && filter.value !== undefined) {
      filtered = this.edgeFilter.byType(filtered, String(filter.value));
    }

    const nodeIds = new Set<string>();
    for (const edge of filtered) {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }
    const relevantNodes = Array.from(nodeIds)
      .map((id) => this.graph.getNode(id))
      .filter((n): n is GraphNode => n !== undefined);

    return { nodes: relevantNodes, edges: filtered };
  }

  private applySemanticFilter(
    filter: FilterConfig,
    allNodes: GraphNode[],
    _allEdges: GraphEdge[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    let filtered = allNodes;

    if (filter.field && filter.value !== undefined) {
      filtered = this.semanticFilter.bySemanticType(filtered, String(filter.value));
    }

    return { nodes: filtered, edges: [] };
  }

  private applyMetricFilter(
    filter: FilterConfig,
    allNodes: GraphNode[],
    _allEdges: GraphEdge[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    let filtered = allNodes;

    if (filter.field && filter.operator === 'GREATER_THAN' && typeof filter.value === 'number') {
      filtered = this.metricFilter.byThreshold(filtered, filter.field, filter.value);
    } else if (filter.field && filter.operator === 'LESS_THAN' && typeof filter.value === 'number') {
      filtered = this.metricFilter.byThreshold(filtered, filter.field, 0, filter.value);
    } else if (filter.field && filter.operator === 'IN_RANGE' && Array.isArray(filter.value)) {
      filtered = this.metricFilter.byThreshold(filtered, filter.field, filter.value[0] as number, filter.value[1] as number);
    }

    return { nodes: filtered, edges: [] };
  }

  private applyStructuralFilter(
    filter: FilterConfig,
    allNodes: GraphNode[],
    _allEdges: GraphEdge[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    let filtered = allNodes;

    if (filter.field === 'degree' && filter.operator === 'GREATER_THAN' && typeof filter.value === 'number') {
      filtered = this.structuralFilter.byDegree(filtered, filter.value);
    } else if (filter.field === 'fanOut' && filter.operator === 'GREATER_THAN' && typeof filter.value === 'number') {
      filtered = this.structuralFilter.byFanOut(filtered, filter.value);
    } else if (filter.field === 'fanIn' && filter.operator === 'GREATER_THAN' && typeof filter.value === 'number') {
      filtered = this.structuralFilter.byFanIn(filtered, filter.value);
    } else if (filter.field === 'island') {
      filtered = this.structuralFilter.byIsland(filtered);
    }

    return { nodes: filtered, edges: [] };
  }

  private getAllEdges(): GraphEdge[] {
    const allNodes = this.graph.getAllNodes();
    const edgeSet = new Map<string, GraphEdge>();
    for (const node of allNodes) {
      for (const edge of this.graph.getEdgesForNode(node.id)) {
        edgeSet.set(edge.id, edge);
      }
    }
    return Array.from(edgeSet.values());
  }
}
