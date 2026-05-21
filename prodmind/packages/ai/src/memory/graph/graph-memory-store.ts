import { createMemorySnapshot } from '../contracts/memory-factories.ts';
import type { MemoryRecord } from '../contracts/memory-record.ts';
import type { MemorySnapshot } from '../contracts/memory-snapshot.ts';
import type { ProvenanceRecord } from '../contracts/provenance-record.ts';
import type { SemanticEdge } from '../contracts/semantic-edge.ts';
import type { SemanticNode } from '../contracts/semantic-node.ts';
import { SemanticGraph } from './semantic-graph.ts';

export class GraphMemoryStore {
  private _records: MemoryRecord[] = [];
  private _nodes: Map<string, SemanticNode> = new Map();
  private _edges: SemanticEdge[] = [];
  private _provenances: Map<string, ProvenanceRecord> = new Map();

  get records(): readonly MemoryRecord[] {
    return Object.freeze([...this._records]);
  }

  get nodes(): readonly SemanticNode[] {
    return Object.freeze([...this._nodes.values()]);
  }

  get edges(): readonly SemanticEdge[] {
    return Object.freeze([...this._edges]);
  }

  get provenances(): readonly ProvenanceRecord[] {
    return Object.freeze([...this._provenances.values()]);
  }

  storeRecord(record: MemoryRecord): void {
    this._records.push(record);
  }

  storeNode(node: SemanticNode): void {
    if (!this._nodes.has(node.id)) {
      this._nodes.set(node.id, node);
    }
  }

  storeEdge(edge: SemanticEdge): void {
    this._edges.push(edge);
  }

  storeProvenance(provenance: ProvenanceRecord): void {
    this._provenances.set(provenance.id, provenance);
  }

  getRecord(id: string): MemoryRecord | undefined {
    return this._records.find(r => r.id === id);
  }

  getNode(id: string): SemanticNode | undefined {
    return this._nodes.get(id);
  }

  getProvenance(id: string): ProvenanceRecord | undefined {
    return this._provenances.get(id);
  }

  getRecordsByCategory(category: string): readonly MemoryRecord[] {
    return Object.freeze(
      this._records.filter(r => r.category === category)
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  getRecordsByPrefix(prefix: string): readonly MemoryRecord[] {
    return Object.freeze(
      this._records.filter(r => r.id.startsWith(prefix))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  getNodesByType(type: string): readonly SemanticNode[] {
    return Object.freeze(
      [...this._nodes.values()].filter(n => n.type === type)
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  toGraph(): SemanticGraph {
    return new SemanticGraph([...this._nodes.values()], [...this._edges]);
  }

  recordCount(): number {
    return this._records.length;
  }

  nodeCount(): number {
    return this._nodes.size;
  }

  edgeCount(): number {
    return this._edges.length;
  }

  takeSnapshot(fingerprint?: string): MemorySnapshot {
    return createMemorySnapshot({
      fingerprint: fingerprint ?? '',
      createdAt: '',
      records: Object.freeze([...this._records]),
      nodes: Object.freeze([...this._nodes.values()]),
      edges: Object.freeze([...this._edges]),
      provenances: Object.freeze([...this._provenances.values()]),
    });
  }

  restoreSnapshot(snapshot: MemorySnapshot): void {
    this._records = [...snapshot.records];
    this._nodes = new Map(snapshot.nodes.map(n => [n.id, n]));
    this._edges = [...snapshot.edges];
    this._provenances = new Map(snapshot.provenances.map(p => [p.id, p]));
  }
}
