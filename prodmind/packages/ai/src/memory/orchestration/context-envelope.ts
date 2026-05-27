import type { ContextEnvelope, MemoryEntry, ArchitecturalFinding } from '../contracts/memory-contracts.ts';
import { computeContextFingerprint } from '../hashing/memory-fingerprint.ts';

let envelopeIdCounter = 0;

export function createContextEnvelope(input: {
  entries: readonly MemoryEntry[];
  findings: readonly ArchitecturalFinding[];
  reasoningChainIds: readonly string[];
  budget: number;
  overflow?: boolean;
}): ContextEnvelope {
  envelopeIdCounter++;
  const id = `env_${envelopeIdCounter}`;
  const totalTokens = input.entries.reduce((sum, e) => sum + Math.ceil(e.content.length / 4), 0) +
    input.findings.reduce((sum, f) => sum + Math.ceil(f.description.length / 4), 0);
  const allIds = input.entries.map(e => e.id);
  const fp = computeContextFingerprint(allIds, input.budget);

  return Object.freeze({
    id,
    entries: Object.freeze([...input.entries]),
    findings: Object.freeze([...input.findings]),
    reasoningChains: Object.freeze([...input.reasoningChainIds]),
    totalTokens,
    budget: input.budget,
    overflow: input.overflow ?? false,
    fingerprint: fp,
  });
}

export function envelopeToMemoryEntry(envelope: ContextEnvelope): MemoryEntry {
  return Object.freeze({
    id: envelope.id,
    category: 'orchestration',
    timestamp: '',
    content: JSON.stringify({
      totalTokens: envelope.totalTokens,
      budget: envelope.budget,
      overflow: envelope.overflow,
      entryCount: envelope.entries.length,
      findingCount: envelope.findings.length,
      chainCount: envelope.reasoningChains.length,
    }),
    fingerprint: envelope.fingerprint,
    metadata: Object.freeze({
      budget: String(envelope.budget),
      totalTokens: String(envelope.totalTokens),
      overflow: String(envelope.overflow),
    }),
    tags: Object.freeze(envelope.reasoningChains),
    provenanceId: '',
    parentId: '',
  });
}

export function compareEnvelopes(a: ContextEnvelope, b: ContextEnvelope): boolean {
  return a.fingerprint === b.fingerprint && a.totalTokens === b.totalTokens;
}

export function mergeEnvelopes(envelopes: readonly ContextEnvelope[]): ContextEnvelope {
  const allEntries = envelopes.flatMap(e => e.entries);
  const allFindings = envelopes.flatMap(e => e.findings);
  const allChains = envelopes.flatMap(e => e.reasoningChains);
  const totalBudget = envelopes.reduce((s, e) => s + e.budget, 0);

  return createContextEnvelope({
    entries: allEntries,
    findings: allFindings,
    reasoningChainIds: [...new Set(allChains)],
    budget: totalBudget,
    overflow: envelopes.some(e => e.overflow),
  });
}
