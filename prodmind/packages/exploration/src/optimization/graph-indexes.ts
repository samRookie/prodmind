import type { NodeId, EdgeId } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';

export class GraphIndexes {
  private typeIndex: Map<string, Set<NodeId>>;
  private propertyIndex: Map<string, Map<unknown, Set<NodeId>>>;
  private edgeTypeIndex: Map<string, Set<EdgeId>>;

  constructor(graph: GraphContract) {
    this.typeIndex = new Map();
    this.propertyIndex = new Map();
    this.edgeTypeIndex = new Map();
    this.rebuild(graph);
  }

  public rebuild(graph: GraphContract): void {
    this.typeIndex.clear();
    this.propertyIndex.clear();
    this.edgeTypeIndex.clear();

    for (const node of graph.getAllNodes()) {
      const typeEntry = this.typeIndex.get(node.type);
      if (typeEntry) {
        typeEntry.add(node.id);
      } else {
        this.typeIndex.set(node.type, new Set([node.id]));
      }

      for (const [propKey, propValue] of Object.entries(node.properties)) {
        if (!this.propertyIndex.has(propKey)) {
          this.propertyIndex.set(propKey, new Map());
        }
        const propMap = this.propertyIndex.get(propKey)!;
        if (!propMap.has(propValue)) {
          propMap.set(propValue, new Set());
        }
        propMap.get(propValue)!.add(node.id);
      }
    }

    for (const node of graph.getAllNodes()) {
      const edges = graph.getEdgesForNode(node.id);
      for (const edge of edges) {
        const edgeEntry = this.edgeTypeIndex.get(edge.type);
        if (edgeEntry) {
          edgeEntry.add(edge.id);
        } else {
          this.edgeTypeIndex.set(edge.type, new Set([edge.id]));
        }
      }
    }
  }

  public findNodesByType(nodeType: string): NodeId[] {
    const ids = this.typeIndex.get(nodeType);
    return ids ? Array.from(ids) : [];
  }

  public findNodesByProperty(property: string, value: unknown): NodeId[] {
    const propMap = this.propertyIndex.get(property);
    if (!propMap) return [];
    const ids = propMap.get(value);
    return ids ? Array.from(ids) : [];
  }

  public findEdgesByType(edgeType: string): EdgeId[] {
    const ids = this.edgeTypeIndex.get(edgeType);
    return ids ? Array.from(ids) : [];
  }

  public optimizeQuery(query: string): string {
    let optimized = query;
    const nodesByType = this.typeIndex;
    for (const [type] of nodesByType) {
      const typeLower = type.toLowerCase();
      if (optimized.includes(typeLower) && this.findNodesByType(type).length < 10) {
        optimized = optimized.replace(
          new RegExp(typeLower, 'g'),
          `${typeLower}_USING_INDEX`,
        );
      }
    }
    return optimized;
  }

  public stats(): { typeIndexSize: number; propertyIndexes: number; edgeIndexSize: number } {
    let propertyIndexes = 0;
    for (const propMap of this.propertyIndex.values()) {
      propertyIndexes += propMap.size;
    }
    return {
      typeIndexSize: this.typeIndex.size,
      propertyIndexes,
      edgeIndexSize: this.edgeTypeIndex.size,
    };
  }
}
