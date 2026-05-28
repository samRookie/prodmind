import type { KnowledgeRelation, RelationType } from './knowledge-types.ts';
import { fingerprintKnowledgeRelation } from './knowledge-fingerprint.ts';
import { createHash } from 'node:crypto';

export function createKnowledgeRelation(input: {
  sourceId: string; targetId: string; relationType: RelationType;
  weight?: number; metadata?: Record<string, unknown>;
}): KnowledgeRelation {
  const rel: KnowledgeRelation = {
    id: createHash('sha256').update(`${input.sourceId}:${input.targetId}:${input.relationType}`).digest('hex'),
    sourceId: input.sourceId, targetId: input.targetId,
    relationType: input.relationType, weight: input.weight ?? 1,
    fingerprint: '', metadata: { ...input.metadata },
  };
  rel.fingerprint = fingerprintKnowledgeRelation(rel);
  return rel;
}
