import { describe, expect, it } from 'vitest';
import { ContextBudget, ContextCompression, ContextDeduplication, createContextEnvelope, envelopeToMemoryEntry, compareEnvelopes, mergeEnvelopes, ContextOrchestrator } from '../orchestration/index.ts';
import type { ContextEnvelope, MemoryEntry, ArchitecturalFinding } from '../contracts/memory-contracts.ts';
import type { ChainResult } from '../reasoning/reasoning-chain.ts';
import { MemoryRepository } from '../repository/memory-repository.ts';

/* ------------------------------------------------------------------ */
/*  ContextBudget                                                      */
/* ------------------------------------------------------------------ */
describe('ContextBudget', () => {
  it('constructor sets default globalBudget to 8192', () => {
    const b = new ContextBudget();
    expect(b.globalBudget).toBe(8192);
  });

  it('constructor accepts custom globalBudget', () => {
    const b = new ContextBudget(4096);
    expect(b.globalBudget).toBe(4096);
  });

  it('getters: globalBudget, usedTokens (starts 0), remainingTokens', () => {
    const b = new ContextBudget(1000);
    expect(b.globalBudget).toBe(1000);
    expect(b.usedTokens).toBe(0);
    expect(b.remainingTokens).toBe(1000);
  });

  it('setGlobalBudget enforces minimum 1', () => {
    const b = new ContextBudget(100);
    b.setGlobalBudget(0);
    expect(b.globalBudget).toBe(1);
    b.setGlobalBudget(-5);
    expect(b.globalBudget).toBe(1);
    b.setGlobalBudget(50);
    expect(b.globalBudget).toBe(50);
  });

  it('allocate sets category allocation', () => {
    const b = new ContextBudget();
    b.allocate('architectural', 4000);
    const alloc = b.getAllocation('architectural');
    expect(alloc).toBeDefined();
    expect(alloc!.category).toBe('architectural');
    expect(alloc!.allocatedTokens).toBe(4000);
    expect(alloc!.usedTokens).toBe(0);
  });

  it('getAllocation returns undefined for unallocated category', () => {
    const b = new ContextBudget();
    expect(b.getAllocation('missing')).toBeUndefined();
  });

  it('consume returns false if category not allocated', () => {
    const b = new ContextBudget();
    expect(b.consume('unallocated', 10)).toBe(false);
  });

  it('consume returns false if exceeds category limit', () => {
    const b = new ContextBudget();
    b.allocate('arch', 50);
    expect(b.consume('arch', 60)).toBe(false);
  });

  it('consume returns false if exceeds global budget', () => {
    const b = new ContextBudget(100);
    b.allocate('arch', 200);
    expect(b.consume('arch', 150)).toBe(false);
  });

  it('consume succeeds when within limits and updates usedTokens', () => {
    const b = new ContextBudget(1000);
    b.allocate('cat1', 500);
    expect(b.consume('cat1', 100)).toBe(true);
    expect(b.usedTokens).toBe(100);
    const alloc = b.getAllocation('cat1');
    expect(alloc!.usedTokens).toBe(100);
  });

  it('fitsWithinBudget checks if entry fits', () => {
    const b = new ContextBudget(1000);
    const entry: MemoryEntry = Object.freeze({
      id: 'e1', category: 'execution', timestamp: '', content: 'abc',
      fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]),
      provenanceId: '', parentId: '',
    });
    expect(b.fitsWithinBudget(entry)).toBe(true);
    b.setGlobalBudget(1);
    expect(b.fitsWithinBudget(entry)).toBe(false);
  });

  it('allocateBudget distributes entries by category, respecting allocations and global budget, returns sorted', () => {
    const b = new ContextBudget(1000);
    b.allocate('arch', 300);
    b.allocate('metrics', 200);

    const entries: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e2', category: 'arch', timestamp: '2024-01-02', content: 'x'.repeat(1200), fingerprint: 'fp2', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e1', category: 'arch', timestamp: '2024-01-01', content: 'short', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e3', category: 'metrics', timestamp: '', content: 'data', fingerprint: 'fp3', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);

    const result = b.allocateBudget(entries);
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(e => e.id !== 'e2' || b.estimateTokens(e) > 300)).toBe(true);
    const ids = result.map(e => e.id);
    expect([...ids].sort()).toEqual(ids);
  });

  it('reset resets usedTokens but keeps allocations', () => {
    const b = new ContextBudget(100);
    b.allocate('cat', 50);
    b.consume('cat', 30);
    expect(b.usedTokens).toBe(30);
    b.reset();
    expect(b.usedTokens).toBe(0);
    expect(b.getAllocation('cat')).toBeDefined();
  });

  it('clear resets everything', () => {
    const b = new ContextBudget(100);
    b.allocate('cat', 50);
    b.consume('cat', 10);
    b.clear();
    expect(b.usedTokens).toBe(0);
    expect(b.getAllocation('cat')).toBeUndefined();
  });

  it('estimateTokens estimates tokens from content, metadata and tags', () => {
    const b = new ContextBudget();
    const entry: MemoryEntry = Object.freeze({
      id: 'e1', category: 'execution', timestamp: '', content: 'hello',
      fingerprint: 'fp1', metadata: Object.freeze({ key: 'value' }),
      tags: Object.freeze(['a', 'b']), provenanceId: '', parentId: '',
    });
    const estimated = b.estimateTokens(entry);
    const expected = Math.ceil(('hello'.length + JSON.stringify(entry.metadata).length + 'a,b'.length) / 4);
    expect(estimated).toBe(expected);
  });
});

/* ------------------------------------------------------------------ */
/*  ContextCompression                                                 */
/* ------------------------------------------------------------------ */
describe('ContextCompression', () => {
  it('compressByPriority sorts by priority (architectural > metrics > others, +tags for critical/warning) and greedy-selects within maxTokens', () => {
    const c = new ContextCompression();
    const entries: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e1', category: 'other', timestamp: '', content: 'x'.repeat(100), fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e2', category: 'architectural', timestamp: '', content: 'y'.repeat(100), fingerprint: 'fp2', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e3', category: 'metrics', timestamp: '', content: 'z'.repeat(100), fingerprint: 'fp3', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e4', category: 'other', timestamp: '', content: 'w'.repeat(100), fingerprint: 'fp4', metadata: Object.freeze({}), tags: Object.freeze(['critical']), provenanceId: '', parentId: '' }),
    ]);
    const result = c.compressByPriority(entries, 100);
    expect(result.entries.length).toBe(3);
    expect(result.entries[0]!.id).toBe('e2');
    expect(result.entries[1]!.id).toBe('e4');
    expect(result.entries[2]!.id).toBe('e3');
  });

  it('returns compression ratio', () => {
    const c = new ContextCompression();
    const entries: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e1', category: 'other', timestamp: '', content: 'x'.repeat(100), fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e2', category: 'other', timestamp: '', content: 'y'.repeat(100), fingerprint: 'fp2', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);
    const result = c.compressByPriority(entries, 50);
    expect(result.ratio).toBeGreaterThan(0);
    expect(result.ratio).toBeLessThan(1);
    expect(result.compressedTokenCount).toBeLessThan(result.originalTokenCount);
  });

  it('when under maxTokens, returns no-op with ratio 1', () => {
    const c = new ContextCompression();
    const entries: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e1', category: 'other', timestamp: '', content: 'short', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);
    const result = c.compressByPriority(entries, 10000);
    expect(result.entries.length).toBe(1);
    expect(result.originalTokenCount).toBe(result.compressedTokenCount);
    expect(result.ratio).toBe(1);
  });

  it('compressByRelevance sorts by relevance scores', () => {
    const c = new ContextCompression();
    const entries: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e1', category: 'other', timestamp: '', content: 'a', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e2', category: 'other', timestamp: '', content: 'b', fingerprint: 'fp2', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);
    const scores: Readonly<Record<string, number>> = Object.freeze({ e1: 10, e2: 5 });
    const result = c.compressByRelevance(entries, 1000, scores);
    expect(result.entries[0]!.id).toBe('e1');
    expect(result.entries[1]!.id).toBe('e2');
  });

  it('compressByRelevance returns no-op when under maxTokens', () => {
    const c = new ContextCompression();
    const entries: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e1', category: 'other', timestamp: '', content: 'tiny', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);
    const result = c.compressByRelevance(entries, 10000, Object.freeze({}));
    expect(result.ratio).toBe(1);
  });

  it('compressFindings sorts by severity (critical > warning > info) and limits to maxCount', () => {
    const c = new ContextCompression();
    const findings: readonly ArchitecturalFinding[] = Object.freeze([
      Object.freeze({ id: 'f1', findingType: 'drift', label: 'a', description: '', severity: 'info', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp1' }),
      Object.freeze({ id: 'f2', findingType: 'drift', label: 'b', description: '', severity: 'critical', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp2' }),
      Object.freeze({ id: 'f3', findingType: 'drift', label: 'c', description: '', severity: 'warning', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp3' }),
      Object.freeze({ id: 'f4', findingType: 'drift', label: 'd', description: '', severity: 'info', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp4' }),
    ]);
    const result = c.compressFindings(findings, 2);
    expect(result).toHaveLength(2);
    expect(result[0]!.severity).toBe('critical');
    expect(result[1]!.severity).toBe('warning');
    expect(Object.isFrozen(result)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  ContextDeduplication                                               */
/* ------------------------------------------------------------------ */
describe('ContextDeduplication', () => {
  it('deduplicateEntries deduplicates by category|fingerprint|content, keeps latest timestamp', () => {
    const d = new ContextDeduplication();
    const entries: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e1', category: 'arch', timestamp: '2024-01-01', content: 'same', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e2', category: 'arch', timestamp: '2024-01-02', content: 'same', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e3', category: 'metrics', timestamp: '', content: 'diff', fingerprint: 'fp2', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);
    const result = d.deduplicateEntries(entries);
    expect(result).toHaveLength(2);
    expect(result.find(e => e.id === 'e2')).toBeDefined();
    expect(result.find(e => e.id === 'e1')).toBeUndefined();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('deduplicateFindings deduplicates by findingType|label', () => {
    const d = new ContextDeduplication();
    const findings: readonly ArchitecturalFinding[] = Object.freeze([
      Object.freeze({ id: 'f1', findingType: 'drift', label: 'same', description: '', severity: 'info', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp1' }),
      Object.freeze({ id: 'f2', findingType: 'drift', label: 'same', description: '', severity: 'info', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp2' }),
      Object.freeze({ id: 'f3', findingType: 'hotspot', label: 'different', description: '', severity: 'info', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp3' }),
    ]);
    const result = d.deduplicateFindings(findings);
    expect(result).toHaveLength(2);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('deduplicateByFingerprint deduplicates by fingerprint', () => {
    const d = new ContextDeduplication();
    const entries: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e1', category: 'arch', timestamp: '', content: 'a', fingerprint: 'fp_same', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e2', category: 'metrics', timestamp: '', content: 'b', fingerprint: 'fp_same', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e3', category: 'other', timestamp: '', content: 'c', fingerprint: 'fp_other', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);
    const result = d.deduplicateByFingerprint(entries);
    expect(result).toHaveLength(2);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('mergeDeduplicated merges two arrays, keeping latest per key', () => {
    const d = new ContextDeduplication();
    const prev: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e1', category: 'arch', timestamp: '2024-01-01', content: 'same', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);
    const newer: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e2', category: 'arch', timestamp: '2024-01-02', content: 'same', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
      Object.freeze({ id: 'e3', category: 'metrics', timestamp: '', content: 'unique', fingerprint: 'fp2', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);
    const result = d.mergeDeduplicated(prev, newer);
    expect(result).toHaveLength(2);
    expect(result.find(e => e.id === 'e2')).toBeDefined();
    expect(Object.isFrozen(result)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  ContextEnvelope functions                                          */
/* ------------------------------------------------------------------ */
describe('ContextEnvelope functions', () => {
  it('createContextEnvelope creates envelope with id, entries, findings, chains, tokens, budget, overflow, fingerprint', () => {
    const entries: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e1', category: 'arch', timestamp: '', content: 'hello', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);
    const findings: readonly ArchitecturalFinding[] = Object.freeze([]);
    const chains: readonly string[] = Object.freeze(['chain_1']);

    const envelope = createContextEnvelope({ entries, findings, reasoningChainIds: chains, budget: 8192, overflow: false });
    expect(envelope.id).toMatch(/^env_\d+$/);
    expect(envelope.entries).toHaveLength(1);
    expect(envelope.findings).toHaveLength(0);
    expect(envelope.reasoningChains).toEqual(['chain_1']);
    expect(envelope.totalTokens).toBeGreaterThan(0);
    expect(envelope.budget).toBe(8192);
    expect(envelope.overflow).toBe(false);
    expect(envelope.fingerprint).toBeTruthy();
    expect(Object.isFrozen(envelope)).toBe(true);
  });

  it('envelopeToMemoryEntry converts envelope to MemoryEntry', () => {
    const envelope: ContextEnvelope = Object.freeze({
      id: 'env_1',
      entries: Object.freeze([]),
      findings: Object.freeze([]),
      reasoningChains: Object.freeze(['c1']),
      totalTokens: 100,
      budget: 8192,
      overflow: false,
      fingerprint: 'fp_env',
    });
    const entry = envelopeToMemoryEntry(envelope);
    expect(entry.id).toBe('env_1');
    expect(entry.category).toBe('orchestration');
    expect(entry.fingerprint).toBe('fp_env');
    expect(Object.isFrozen(entry)).toBe(true);
    const parsed = JSON.parse(entry.content);
    expect(parsed.totalTokens).toBe(100);
    expect(parsed.budget).toBe(8192);
  });

  it('compareEnvelopes compares by fingerprint and totalTokens', () => {
    const a: ContextEnvelope = Object.freeze({ id: 'e1', entries: Object.freeze([]), findings: Object.freeze([]), reasoningChains: Object.freeze([]), totalTokens: 100, budget: 8192, overflow: false, fingerprint: 'fp1' });
    const b: ContextEnvelope = Object.freeze({ id: 'e2', entries: Object.freeze([]), findings: Object.freeze([]), reasoningChains: Object.freeze([]), totalTokens: 100, budget: 8192, overflow: false, fingerprint: 'fp1' });
    const c: ContextEnvelope = Object.freeze({ id: 'e3', entries: Object.freeze([]), findings: Object.freeze([]), reasoningChains: Object.freeze([]), totalTokens: 200, budget: 8192, overflow: false, fingerprint: 'fp1' });
    expect(compareEnvelopes(a, b)).toBe(true);
    expect(compareEnvelopes(a, c)).toBe(false);
  });

  it('mergeEnvelopes merges multiple envelopes, deduplicates chain ids', () => {
    const e1: ContextEnvelope = Object.freeze({
      id: 'e1', entries: Object.freeze([]), findings: Object.freeze([]),
      reasoningChains: Object.freeze(['c1', 'c2']), totalTokens: 50, budget: 4096, overflow: false, fingerprint: 'fp1',
    });
    const e2: ContextEnvelope = Object.freeze({
      id: 'e2', entries: Object.freeze([]), findings: Object.freeze([]),
      reasoningChains: Object.freeze(['c2', 'c3']), totalTokens: 30, budget: 2048, overflow: true, fingerprint: 'fp2',
    });
    const merged = mergeEnvelopes(Object.freeze([e1, e2]));
    expect(merged.reasoningChains).toEqual(['c1', 'c2', 'c3']);
    expect(merged.budget).toBe(6144);
    expect(merged.overflow).toBe(true);
    expect(merged.totalTokens).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  ContextOrchestrator                                                */
/* ------------------------------------------------------------------ */
describe('ContextOrchestrator', () => {
  it('constructor takes MemoryRepository and options', () => {
    const repo = new MemoryRepository();
    const orch = new ContextOrchestrator(repo, { budget: 4096, compress: false });
    expect(orch.repository).toBe(repo);
    expect(orch.budget).toBeInstanceOf(ContextBudget);
    expect(orch.compression).toBeInstanceOf(ContextCompression);
    expect(orch.deduplication).toBeInstanceOf(ContextDeduplication);
  });

  it('options getter returns frozen copy', () => {
    const repo = new MemoryRepository();
    const orch = new ContextOrchestrator(repo);
    const opts = orch.options;
    expect(opts.budget).toBe(8192);
    expect(opts.compress).toBe(true);
    expect(opts.deduplicate).toBe(true);
    expect(opts.includeFindings).toBe(true);
    expect(opts.maxFindings).toBe(20);
    expect(Object.isFrozen(opts)).toBe(true);
  });

  it('buildEnvelope processes entries through dedup, compression, budget, returns ContextEnvelope', () => {
    const repo = new MemoryRepository();
    const orch = new ContextOrchestrator(repo, { budget: 10000, compress: true, deduplicate: true });

    const entries: readonly MemoryEntry[] = Object.freeze([
      Object.freeze({ id: 'e1', category: 'architectural', timestamp: '', content: 'first entry', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ]);
    const findings: readonly ArchitecturalFinding[] = Object.freeze([
      Object.freeze({ id: 'f1', findingType: 'drift', label: 'test', description: 'a finding', severity: 'critical', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp_f1' }),
    ]);
    const chains: readonly ChainResult[] = Object.freeze([
      Object.freeze({ chainId: 'chain_1', chainType: 'architectural_drift', steps: Object.freeze([]), conclusion: '', confidence: 0.9, fingerprint: 'fp_chain' }),
    ]);

    const envelope = orch.buildEnvelope(entries, findings, chains);
    expect(envelope).toBeDefined();
    expect(envelope.id).toMatch(/^env_\d+$/);
    expect(envelope.entries.length).toBeGreaterThan(0);
    expect(envelope.reasoningChains).toContain('chain_1');
    expect(Object.isFrozen(envelope)).toBe(true);
  });

  it('buildFromRepository loads from repository and calls buildEnvelope', () => {
    const repo = new MemoryRepository();
    const entry: MemoryEntry = Object.freeze({ id: 'repo_e1', category: 'execution', timestamp: '', content: 'from repo', fingerprint: 'fp_repo', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    repo.storeEntry(entry);

    const orch = new ContextOrchestrator(repo, { budget: 5000 });
    const envelope = orch.buildFromRepository(['repo_e1']);
    expect(envelope.entries.some(e => e.id === 'repo_e1')).toBe(true);
    expect(envelope.budget).toBe(5000);
  });

  it('getOrchestrationFingerprint returns deterministic fingerprint', () => {
    const repo = new MemoryRepository();
    const orch = new ContextOrchestrator(repo);
    const fp1 = orch.getOrchestrationFingerprint(['a', 'b']);
    const fp2 = orch.getOrchestrationFingerprint(['a', 'b']);
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(64);
  });

  it('updateOptions changes options', () => {
    const repo = new MemoryRepository();
    const orch = new ContextOrchestrator(repo);
    orch.updateOptions({ budget: 999, compress: false });
    expect(orch.options.budget).toBe(999);
    expect(orch.options.compress).toBe(false);
  });

  it('reset resets budget', () => {
    const repo = new MemoryRepository();
    const orch = new ContextOrchestrator(repo);
    orch.budget.allocate('cat', 100);
    orch.budget.consume('cat', 50);
    expect(orch.budget.usedTokens).toBe(50);
    orch.reset();
    expect(orch.budget.usedTokens).toBe(0);
  });
});
