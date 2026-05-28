import { createHash } from 'node:crypto';
import type { KnowledgeGraph, KnowledgeNode, KnowledgeRelation, KnowledgeTraversalResult } from './knowledge-types.ts';

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map(k => `${canonicalJson(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return String(value);
}

export function fingerprintKnowledgeGraph(graph: KnowledgeGraph): string {
  const nodeFps = [...graph.nodes.values()].map(n => n.fingerprint).sort();
  const relFps = [...graph.relations.values()].map(r => r.fingerprint).sort();
  return createHash('sha256').update(canonicalJson({ nodes: nodeFps, relations: relFps })).digest('hex');
}

export function fingerprintKnowledgeNode(node: KnowledgeNode): string {
  return createHash('sha256').update(canonicalJson({ id: node.id, type: node.type, label: node.label })).digest('hex');
}

export function fingerprintKnowledgeRelation(rel: KnowledgeRelation): string {
  return createHash('sha256').update(canonicalJson({ sourceId: rel.sourceId, targetId: rel.targetId, relationType: rel.relationType })).digest('hex');
}

export function fingerprintTraversal(result: KnowledgeTraversalResult): string {
  const nodeIds = result.path.map(p => p.node.id);
  return createHash('sha256').update(canonicalJson(nodeIds)).digest('hex');
}
