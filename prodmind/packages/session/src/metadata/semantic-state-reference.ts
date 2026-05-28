import { randomBytes } from 'node:crypto';
import { computeDeterministicHash, nowISO } from '../utils/index.ts';

export interface SemanticStateReferenceData {
  id?: string;
  sessionId: string;
  label: string;
  stateHash: string;
  description?: string;
  createdAt?: string;
}

function generateSemanticRefId(): string {
  return `sref_${randomBytes(12).toString('hex')}`;
}

export class SemanticStateReference {
  private references: Map<string, SemanticStateReference> = new Map();

  public readonly id: string;
  public readonly sessionId: string;
  public label: string;
  public stateHash: string;
  public description?: string;
  public readonly createdAt: string;

  public constructor(data: SemanticStateReferenceData) {
    this.id = data.id ?? generateSemanticRefId();
    this.sessionId = data.sessionId;
    this.label = data.label;
    this.stateHash = data.stateHash;
    this.description = data.description;
    this.createdAt = data.createdAt ?? nowISO();
  }

  public createReference(sessionId: string, label: string, stateHash?: string, description?: string): SemanticStateReference {
    const hash = stateHash ?? computeDeterministicHash({ sessionId, label, createdAt: nowISO() });
    const ref = new SemanticStateReference({
      sessionId,
      label,
      stateHash: hash,
      description,
    });
    this.references.set(ref.id, ref);
    return ref;
  }

  public findByLabel(sessionId: string, label: string): SemanticStateReference[] {
    return Array.from(this.references.values()).filter(
      (r) => r.sessionId === sessionId && r.label === label,
    );
  }

  public findByStateHash(sessionId: string, stateHash: string): SemanticStateReference[] {
    return Array.from(this.references.values()).filter(
      (r) => r.sessionId === sessionId && r.stateHash === stateHash,
    );
  }

  public deleteReference(id: string): void {
    this.references.delete(id);
  }

  public listReferences(sessionId: string): SemanticStateReference[] {
    return Array.from(this.references.values()).filter((r) => r.sessionId === sessionId);
  }

  public toJSON(): SemanticStateReferenceData {
    return {
      id: this.id,
      sessionId: this.sessionId,
      label: this.label,
      stateHash: this.stateHash,
      description: this.description,
      createdAt: this.createdAt,
    };
  }

  public static fromJSON(data: SemanticStateReferenceData): SemanticStateReference {
    return new SemanticStateReference(data);
  }
}
