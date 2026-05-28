import type { GraphNode, GraphEdge, GraphSnapshot } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export function createMockGraph(): GraphContract {
  const nodes = new Map<string, GraphNode>([
    ['A', { id: 'A', type: 'module', properties: { instability: 0.3, fanOut: 2, fanIn: 0, complexity: 5, cohesion: 0.8, name: 'ModuleA', riskScore: 10 } }],
    ['B', { id: 'B', type: 'module', properties: { instability: 0.5, fanOut: 2, fanIn: 1, complexity: 8, cohesion: 0.6, name: 'ModuleB', riskScore: 20 } }],
    ['C', { id: 'C', type: 'component', properties: { instability: 0.7, fanOut: 1, fanIn: 1, complexity: 3, cohesion: 0.9, name: 'ComponentC', riskScore: 5 } }],
    ['D', { id: 'D', type: 'module', properties: { instability: 0.4, fanOut: 1, fanIn: 2, complexity: 12, cohesion: 0.7, name: 'ModuleD', riskScore: 15, semanticType: 'core' } }],
    ['E', { id: 'E', type: 'component', properties: { instability: 0.2, fanOut: 1, fanIn: 1, complexity: 2, cohesion: 0.5, name: 'ComponentE', riskScore: 30 } }],
    ['F', { id: 'F', type: 'utility', properties: { instability: 0.1, fanOut: 0, fanIn: 1, complexity: 1, cohesion: 1.0, name: 'UtilityF', riskScore: 0 } }],
  ]);

  const edges = new Map<string, GraphEdge>([
    ['e1', { id: 'e1', source: 'A', target: 'B', type: 'depends', weight: 1, properties: { label: 'A->B' } }],
    ['e2', { id: 'e2', source: 'A', target: 'C', type: 'depends', weight: 2, properties: { label: 'A->C' } }],
    ['e3', { id: 'e3', source: 'B', target: 'D', type: 'depends', weight: 1, properties: { label: 'B->D' } }],
    ['e4', { id: 'e4', source: 'C', target: 'D', type: 'depends', weight: 3, properties: { label: 'C->D' } }],
    ['e5', { id: 'e5', source: 'D', target: 'E', type: 'depends', weight: 1, properties: { label: 'D->E' } }],
    ['e6', { id: 'e6', source: 'E', target: 'F', type: 'depends', weight: 2, properties: { label: 'E->F' } }],
    ['e7', { id: 'e7', source: 'B', target: 'E', type: 'depends', weight: 4, properties: { label: 'B->E' } }],
  ]);

  const graph: GraphContract = {
    getNode(id: string): GraphNode | undefined {
      return nodes.get(id);
    },
    getNodes(ids: string[]): GraphNode[] {
      return ids.map(id => nodes.get(id)).filter((n): n is GraphNode => n !== undefined);
    },
    getAllNodes(): GraphNode[] {
      return Array.from(nodes.values());
    },
    getEdge(id: string): GraphEdge | undefined {
      return edges.get(id);
    },
    getEdges(ids: string[]): GraphEdge[] {
      return ids.map(id => edges.get(id)).filter((e): e is GraphEdge => e !== undefined);
    },
    getEdgesForNode(nodeId: string): GraphEdge[] {
      if (nodeId === '*') return Array.from(edges.values());
      return Array.from(edges.values()).filter(e => e.source === nodeId || e.target === nodeId);
    },
    getOutgoingEdges(nodeId: string): GraphEdge[] {
      return Array.from(edges.values()).filter(e => e.source === nodeId);
    },
    getIncomingEdges(nodeId: string): GraphEdge[] {
      return Array.from(edges.values()).filter(e => e.target === nodeId);
    },
    getNeighbors(nodeId: string): GraphNode[] {
      const neighborIds = Array.from(edges.values())
        .filter(e => e.source === nodeId || e.target === nodeId)
        .map(e => (e.source === nodeId ? e.target : e.source));
      return [...new Set(neighborIds)].map(id => nodes.get(id)).filter((n): n is GraphNode => n !== undefined);
    },
    getSnapshot(): GraphSnapshot {
      return {
        nodes: Array.from(nodes.values()),
        edges: Array.from(edges.values()),
        metadata: {
          nodeCount: nodes.size,
          edgeCount: edges.size,
          timestamp: new Date().toISOString(),
          fingerprint: '',
        },
      };
    },
    nodeCount(): number { return nodes.size; },
    edgeCount(): number { return edges.size; },
  };

  return graph;
}
