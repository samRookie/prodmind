import type { KnowledgeNode, KnowledgeNodeType } from './knowledge-types.ts';
import { fingerprintKnowledgeNode } from './knowledge-fingerprint.ts';

export function createKnowledgeNode(input: {
  id: string; type: KnowledgeNodeType; label: string;
  description: string; metadata?: Record<string, unknown>;
}): KnowledgeNode {
  const node: KnowledgeNode = {
    id: input.id, type: input.type, label: input.label,
    description: input.description, fingerprint: '',
    metadata: { ...input.metadata },
  };
  node.fingerprint = fingerprintKnowledgeNode(node);
  return node;
}
