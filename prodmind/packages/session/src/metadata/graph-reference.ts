import { randomBytes } from 'node:crypto';
import { nowISO, computeDeterministicHash } from '../utils/index.ts';

export type ReferenceType = 'NODE' | 'EDGE' | 'SNAPSHOT';

export interface GraphReferenceData {
  id?: string;
  sessionId: string;
  nodeId?: string;
  edgeId?: string;
  snapshotId?: string;
  referenceType: ReferenceType;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  stateHash?: string;
}

function generateGraphRefId(): string {
  return `gref_${randomBytes(12).toString('hex')}`;
}

export class GraphReference {
  public readonly id: string;
  public readonly sessionId: string;
  public nodeId?: string;
  public edgeId?: string;
  public snapshotId?: string;
  public referenceType: ReferenceType;
  public metadata?: Record<string, unknown>;
  public readonly createdAt: string;
  public readonly stateHash?: string;

  public constructor(data: GraphReferenceData) {
    this.id = data.id ?? generateGraphRefId();
    this.sessionId = data.sessionId;
    this.nodeId = data.nodeId;
    this.edgeId = data.edgeId;
    this.snapshotId = data.snapshotId;
    this.referenceType = data.referenceType;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt ?? nowISO();
    this.stateHash = data.stateHash ?? computeDeterministicHash({
      sessionId: data.sessionId,
      nodeId: data.nodeId,
      edgeId: data.edgeId,
      snapshotId: data.snapshotId,
      referenceType: data.referenceType,
    });
  }

  public static createNodeReference(sessionId: string, nodeId: string, snapshotId: string): GraphReference {
    return new GraphReference({
      sessionId,
      nodeId,
      snapshotId,
      referenceType: 'NODE',
    });
  }

  public static createEdgeReference(sessionId: string, edgeId: string, snapshotId: string): GraphReference {
    return new GraphReference({
      sessionId,
      edgeId,
      snapshotId,
      referenceType: 'EDGE',
    });
  }

  public static createSnapshotReference(sessionId: string, snapshotId: string): GraphReference {
    return new GraphReference({
      sessionId,
      snapshotId,
      referenceType: 'SNAPSHOT',
    });
  }

  public validate(reference: GraphReference): boolean {
    if (!reference.sessionId) return false;
    if (reference.referenceType === 'NODE' && !reference.nodeId) return false;
    if (reference.referenceType === 'EDGE' && !reference.edgeId) return false;
    if (reference.referenceType === 'SNAPSHOT' && !reference.snapshotId) return false;
    return true;
  }

  public resolveReference(db: { getNode?: (id: string) => unknown; getEdge?: (id: string) => unknown; getSnapshot?: (id: string) => unknown }): unknown {
    switch (this.referenceType) {
      case 'NODE':
        return this.nodeId ? db.getNode?.(this.nodeId) : undefined;
      case 'EDGE':
        return this.edgeId ? db.getEdge?.(this.edgeId) : undefined;
      case 'SNAPSHOT':
        return this.snapshotId ? db.getSnapshot?.(this.snapshotId) : undefined;
    }
  }

  public toJSON(): GraphReferenceData {
    return {
      id: this.id,
      sessionId: this.sessionId,
      nodeId: this.nodeId,
      edgeId: this.edgeId,
      snapshotId: this.snapshotId,
      referenceType: this.referenceType,
      metadata: this.metadata,
      createdAt: this.createdAt,
      stateHash: this.stateHash,
    };
  }

  public static fromJSON(data: GraphReferenceData): GraphReference {
    return new GraphReference(data);
  }
}
