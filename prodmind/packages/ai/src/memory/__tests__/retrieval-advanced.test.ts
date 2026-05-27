import { describe, expect, it } from 'vitest';

import type { MemoryEntry, ArchitecturalFinding } from '../contracts/memory-contracts.ts';
import { RetrievalBudget } from '../retrieval/retrieval-budget.ts';
import { RetrievalFilter } from '../retrieval/retrieval-filter.ts';
import { RetrievalSelection, type SelectionScore } from '../retrieval/retrieval-selection.ts';

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

function makeEntry(overrides?: Partial<MemoryEntry>): MemoryEntry {
  return Object.freeze({
    id: 'entry_1',
    category: 'execution',
    timestamp: '2024-01-01T00:00:00.000Z',
    content: 'test content',
    fingerprint: 'fp_abc123',
    metadata: Object.freeze({ source: 'test' }),
    tags: Object.freeze(['test-tag']),
    provenanceId: 'prov_1',
    parentId: '',
    ...overrides,
  }) satisfies MemoryEntry;
}

function makeFinding(overrides?: Partial<ArchitecturalFinding>): ArchitecturalFinding {
  return Object.freeze({
    id: 'finding_1',
    findingType: 'dependency_impact',
    label: 'High coupling detected',
    description: 'Module X has high coupling',
    severity: 'warning',
    affectedNodeIds: Object.freeze(['node_a']),
    dependencies: Object.freeze(['dep_x']),
    timestamp: '2024-01-01T00:00:00.000Z',
    fingerprint: 'fp_finding_1',
    ...overrides,
  }) satisfies ArchitecturalFinding;
}

/* ------------------------------------------------------------------ */
/*  RetrievalBudget                                                      */
/* ------------------------------------------------------------------ */
describe('RetrievalBudget', () => {
  it('constructor uses defaults', () => {
    const budget = new RetrievalBudget();
    expect(budget.config.maxEntries).toBe(100);
    expect(budget.config.maxFindings).toBe(50);
    expect(budget.config.maxTokens).toBe(8192);
    expect(budget.config.maxDepth).toBe(5);
  });

  it('constructor accepts partial overrides', () => {
    const budget = new RetrievalBudget({ maxEntries: 10, maxDepth: 2 });
    expect(budget.config.maxEntries).toBe(10);
    expect(budget.config.maxFindings).toBe(50);
    expect(budget.config.maxTokens).toBe(8192);
    expect(budget.config.maxDepth).toBe(2);
  });

  it('config returns frozen config object', () => {
    const budget = new RetrievalBudget();
    const cfg = budget.config;
    expect(Object.isFrozen(cfg)).toBe(true);
    expect(() => { (cfg as any).maxEntries = 999; }).toThrow();
  });

  it('update changes config', () => {
    const budget = new RetrievalBudget();
    budget.update({ maxEntries: 200, maxTokens: 16000 });
    expect(budget.config.maxEntries).toBe(200);
    expect(budget.config.maxTokens).toBe(16000);
    expect(budget.config.maxFindings).toBe(50);
  });

  it('canAddEntry returns true when under limits', () => {
    const budget = new RetrievalBudget({ maxEntries: 3, maxTokens: 100 });
    expect(budget.canAddEntry(1, 50)).toBe(true);
  });

  it('canAddEntry returns false when at maxEntries', () => {
    const budget = new RetrievalBudget({ maxEntries: 3, maxTokens: 100 });
    expect(budget.canAddEntry(3, 50)).toBe(false);
  });

  it('canAddEntry returns false when over tokens', () => {
    const budget = new RetrievalBudget({ maxEntries: 3, maxTokens: 100 });
    expect(budget.canAddEntry(1, 150)).toBe(false);
  });

  it('canAddFinding returns true when under maxFindings', () => {
    const budget = new RetrievalBudget({ maxFindings: 2 });
    expect(budget.canAddFinding(0)).toBe(true);
    expect(budget.canAddFinding(1)).toBe(true);
  });

  it('canAddFinding returns false when at maxFindings', () => {
    const budget = new RetrievalBudget({ maxFindings: 2 });
    expect(budget.canAddFinding(2)).toBe(false);
    expect(budget.canAddFinding(3)).toBe(false);
  });

  it('withinDepth returns true when depth <= maxDepth', () => {
    const budget = new RetrievalBudget({ maxDepth: 3 });
    expect(budget.withinDepth(0)).toBe(true);
    expect(budget.withinDepth(3)).toBe(true);
    expect(budget.withinDepth(4)).toBe(false);
  });

  it('trimEntries slices to maxEntries', () => {
    const budget = new RetrievalBudget({ maxEntries: 3 });
    const entries = Object.freeze([
      makeEntry({ id: 'a' }), makeEntry({ id: 'b' }),
      makeEntry({ id: 'c' }), makeEntry({ id: 'd' }),
    ]);
    const trimmed = budget.trimEntries(entries);
    expect(trimmed).toHaveLength(3);
    expect(trimmed[0]!.id).toBe('a');
    expect(trimmed[1]!.id).toBe('b');
    expect(trimmed[2]!.id).toBe('c');
    expect(Object.isFrozen(trimmed)).toBe(true);
  });

  it('trimEntries returns same array when within limit', () => {
    const budget = new RetrievalBudget({ maxEntries: 5 });
    const entries = Object.freeze([makeEntry({ id: 'a' }), makeEntry({ id: 'b' })]);
    const trimmed = budget.trimEntries(entries);
    expect(trimmed).toBe(entries);
  });

  it('trimFindings slices to maxFindings', () => {
    const budget = new RetrievalBudget({ maxFindings: 2 });
    const findings = Object.freeze([
      makeFinding({ id: 'a' }), makeFinding({ id: 'b' }),
      makeFinding({ id: 'c' }),
    ]);
    const trimmed = budget.trimFindings(findings);
    expect(trimmed).toHaveLength(2);
    expect(trimmed[0]!.id).toBe('a');
    expect(trimmed[1]!.id).toBe('b');
    expect(Object.isFrozen(trimmed)).toBe(true);
  });

  it('trimFindings returns same array when within limit', () => {
    const budget = new RetrievalBudget({ maxFindings: 5 });
    const findings = Object.freeze([makeFinding({ id: 'a' })]);
    const trimmed = budget.trimFindings(findings);
    expect(trimmed).toBe(findings);
  });

  it('estimateTokens calculates token count', () => {
    const budget = new RetrievalBudget();
    const entry = makeEntry({ content: 'hello', metadata: Object.freeze({}) });
    const tokens = budget.estimateTokens(entry);
    expect(tokens).toBe(Math.ceil(('hello'.length + '{}'.length) / 4));
  });

  it('reset restores defaults', () => {
    const budget = new RetrievalBudget({ maxEntries: 10, maxFindings: 5, maxTokens: 1024, maxDepth: 1 });
    budget.reset();
    expect(budget.config.maxEntries).toBe(100);
    expect(budget.config.maxFindings).toBe(50);
    expect(budget.config.maxTokens).toBe(8192);
    expect(budget.config.maxDepth).toBe(5);
  });
});

/* ------------------------------------------------------------------ */
/*  RetrievalFilter                                                      */
/* ------------------------------------------------------------------ */
describe('RetrievalFilter', () => {
  it('applyEntryFilter filters by categories', () => {
    const filter = new RetrievalFilter();
    const entries = Object.freeze([
      makeEntry({ id: 'a', category: 'execution' }),
      makeEntry({ id: 'b', category: 'architectural' }),
      makeEntry({ id: 'c', category: 'execution' }),
    ]);
    const result = filter.applyEntryFilter(entries, { categories: Object.freeze(['execution']) });
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('c');
  });

  it('applyEntryFilter filters by tags', () => {
    const filter = new RetrievalFilter();
    const entries = Object.freeze([
      makeEntry({ id: 'a', tags: Object.freeze(['alpha']) }),
      makeEntry({ id: 'b', tags: Object.freeze(['beta']) }),
      makeEntry({ id: 'c', tags: Object.freeze(['alpha', 'gamma']) }),
    ]);
    const result = filter.applyEntryFilter(entries, { tags: Object.freeze(['alpha']) });
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('c');
  });

  it('applyEntryFilter filters by minTimestamp', () => {
    const filter = new RetrievalFilter();
    const entries = Object.freeze([
      makeEntry({ id: 'a', timestamp: '2024-01-01T00:00:00Z' }),
      makeEntry({ id: 'b', timestamp: '2024-06-01T00:00:00Z' }),
      makeEntry({ id: 'c', timestamp: '2024-12-01T00:00:00Z' }),
    ]);
    const result = filter.applyEntryFilter(entries, { minTimestamp: '2024-06-01T00:00:00Z' });
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('b');
    expect(result[1]!.id).toBe('c');
  });

  it('applyEntryFilter filters by maxTimestamp', () => {
    const filter = new RetrievalFilter();
    const entries = Object.freeze([
      makeEntry({ id: 'a', timestamp: '2024-01-01T00:00:00Z' }),
      makeEntry({ id: 'b', timestamp: '2024-06-01T00:00:00Z' }),
      makeEntry({ id: 'c', timestamp: '2024-12-01T00:00:00Z' }),
    ]);
    const result = filter.applyEntryFilter(entries, { maxTimestamp: '2024-06-01T00:00:00Z' });
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('b');
  });

  it('applyEntryFilter filters by fingerprintPrefix', () => {
    const filter = new RetrievalFilter();
    const entries = Object.freeze([
      makeEntry({ id: 'a', fingerprint: 'abc_123' }),
      makeEntry({ id: 'b', fingerprint: 'def_456' }),
      makeEntry({ id: 'c', fingerprint: 'abc_789' }),
    ]);
    const result = filter.applyEntryFilter(entries, { fingerprintPrefix: 'abc' });
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('c');
  });

  it('applyEntryFilter filters by provenanceId', () => {
    const filter = new RetrievalFilter();
    const entries = Object.freeze([
      makeEntry({ id: 'a', provenanceId: 'prov_a' }),
      makeEntry({ id: 'b', provenanceId: 'prov_b' }),
      makeEntry({ id: 'c', provenanceId: 'prov_a' }),
    ]);
    const result = filter.applyEntryFilter(entries, { provenanceId: 'prov_a' });
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('c');
  });

  it('applyEntryFilter returns frozen sorted results', () => {
    const filter = new RetrievalFilter();
    const entries = Object.freeze([
      makeEntry({ id: 'z' }),
      makeEntry({ id: 'a' }),
    ]);
    const result = filter.applyEntryFilter(entries, { categories: Object.freeze(['execution']) });
    expect(Object.isFrozen(result)).toBe(true);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('z');
  });

  it('applyEntryFilter empty criteria returns all entries unchanged (but sorted)', () => {
    const filter = new RetrievalFilter();
    const entries = Object.freeze([
      makeEntry({ id: 'z' }),
      makeEntry({ id: 'a' }),
    ]);
    const result = filter.applyEntryFilter(entries, {});
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('z');
  });

  it('applyFindingFilter filters findings by categories (maps to findingType)', () => {
    const filter = new RetrievalFilter();
    const findings = Object.freeze([
      makeFinding({ id: 'a', findingType: 'dependency_impact' }),
      makeFinding({ id: 'b', findingType: 'architectural_drift' }),
      makeFinding({ id: 'c', findingType: 'dependency_impact' }),
    ]);
    const result = filter.applyFindingFilter(findings, { categories: Object.freeze(['dependency_impact']) });
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('c');
  });

  it('applyFindingFilter filters by minTimestamp', () => {
    const filter = new RetrievalFilter();
    const findings = Object.freeze([
      makeFinding({ id: 'a', timestamp: '2024-01-01T00:00:00Z' }),
      makeFinding({ id: 'b', timestamp: '2024-06-01T00:00:00Z' }),
    ]);
    const result = filter.applyFindingFilter(findings, { minTimestamp: '2024-06-01T00:00:00Z' });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('b');
  });

  it('applyFindingFilter filters by maxTimestamp', () => {
    const filter = new RetrievalFilter();
    const findings = Object.freeze([
      makeFinding({ id: 'a', timestamp: '2024-01-01T00:00:00Z' }),
      makeFinding({ id: 'b', timestamp: '2024-06-01T00:00:00Z' }),
    ]);
    const result = filter.applyFindingFilter(findings, { maxTimestamp: '2024-01-01T00:00:00Z' });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('a');
  });

  it('applyFindingFilter returns frozen sorted results', () => {
    const filter = new RetrievalFilter();
    const findings = Object.freeze([
      makeFinding({ id: 'z', findingType: 'a' }),
      makeFinding({ id: 'a', findingType: 'a' }),
    ]);
    const result = filter.applyFindingFilter(findings, { categories: Object.freeze(['a']) });
    expect(Object.isFrozen(result)).toBe(true);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('z');
  });

  it('filterBySeverity filters by severity level (info < warning < critical)', () => {
    const filter = new RetrievalFilter();
    const findings = Object.freeze([
      makeFinding({ id: 'a', severity: 'info' }),
      makeFinding({ id: 'b', severity: 'critical' }),
      makeFinding({ id: 'c', severity: 'warning' }),
      makeFinding({ id: 'd', severity: 'info' }),
    ]);
    const result = filter.filterBySeverity(findings, 'warning');
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('b');
    expect(result[1]!.id).toBe('c');
  });

  it('filterBySeverity returns all findings for unknown minSeverity', () => {
    const filter = new RetrievalFilter();
    const findings = Object.freeze([
      makeFinding({ id: 'a', severity: 'info' }),
    ]);
    const result = filter.filterBySeverity(findings, 'unknown');
    expect(result).toEqual(findings);
  });

  it('filterBySeverity returns sorted results', () => {
    const filter = new RetrievalFilter();
    const findings = Object.freeze([
      makeFinding({ id: 'b', severity: 'info' }),
      makeFinding({ id: 'a', severity: 'info' }),
    ]);
    const result = filter.filterBySeverity(findings, 'info');
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('b');
  });
});

/* ------------------------------------------------------------------ */
/*  RetrievalSelection                                                   */
/* ------------------------------------------------------------------ */
describe('RetrievalSelection', () => {
  it('selectTopByScore sorts by score descending, id ascending as tiebreaker', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([
      makeEntry({ id: 'a' }),
      makeEntry({ id: 'b' }),
      makeEntry({ id: 'c' }),
    ]);
    const scores: SelectionScore[] = [
      { entryId: 'a', totalScore: 10, dimensionScores: Object.freeze({}) },
      { entryId: 'b', totalScore: 20, dimensionScores: Object.freeze({}) },
      { entryId: 'c', totalScore: 20, dimensionScores: Object.freeze({}) },
    ];
    const result = sel.selectTopByScore(entries, scores, 3);
    expect(result[0]!.id).toBe('b');
    expect(result[1]!.id).toBe('c');
    expect(result[2]!.id).toBe('a');
  });

  it('selectTopByScore limits to maxCount', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([
      makeEntry({ id: 'a' }),
      makeEntry({ id: 'b' }),
    ]);
    const scores: SelectionScore[] = [
      { entryId: 'a', totalScore: 10, dimensionScores: Object.freeze({}) },
      { entryId: 'b', totalScore: 20, dimensionScores: Object.freeze({}) },
    ];
    const result = sel.selectTopByScore(entries, scores, 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('b');
  });

  it('selectTopByScore uses 0 for entries without a score', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([makeEntry({ id: 'a' }), makeEntry({ id: 'b' })]);
    const scores: SelectionScore[] = [
      { entryId: 'b', totalScore: 5, dimensionScores: Object.freeze({}) },
    ];
    const result = sel.selectTopByScore(entries, scores, 2);
    expect(result[0]!.id).toBe('b');
    expect(result[1]!.id).toBe('a');
  });

  it('selectByDiversity round-robins across categories', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([
      makeEntry({ id: 'a', category: 'execution' }),
      makeEntry({ id: 'b', category: 'architectural' }),
      makeEntry({ id: 'c', category: 'execution' }),
    ]);
    const result = sel.selectByDiversity(entries, 3);
    expect(result).toHaveLength(3);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('b');
    expect(result[2]!.id).toBe('c');
  });

  it('selectByDiversity returns sorted by id', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([
      makeEntry({ id: 'z', category: 'metrics' }),
      makeEntry({ id: 'a', category: 'metrics' }),
    ]);
    const result = sel.selectByDiversity(entries, 2);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('z');
  });

  it('selectByDiversity respects maxCount', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([
      makeEntry({ id: 'a', category: 'execution' }),
      makeEntry({ id: 'b', category: 'architectural' }),
    ]);
    const result = sel.selectByDiversity(entries, 1);
    expect(result).toHaveLength(1);
  });

  it('selectByRecency sorts by timestamp descending, id as tiebreaker', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([
      makeEntry({ id: 'b', timestamp: '2024-06-01T00:00:00Z' }),
      makeEntry({ id: 'a', timestamp: '2024-01-01T00:00:00Z' }),
      makeEntry({ id: 'c', timestamp: '2024-06-01T00:00:00Z' }),
    ]);
    const result = sel.selectByRecency(entries, 3);
    expect(result[0]!.id).toBe('b');
    expect(result[1]!.id).toBe('c');
    expect(result[2]!.id).toBe('a');
  });

  it('selectByRecency limits to maxCount', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([
      makeEntry({ id: 'a', timestamp: '2024-06-01T00:00:00Z' }),
      makeEntry({ id: 'b', timestamp: '2024-01-01T00:00:00Z' }),
    ]);
    const result = sel.selectByRecency(entries, 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('a');
  });

  it('selectFindingsBySeverity sorts by severity (critical > warning > info)', () => {
    const sel = new RetrievalSelection();
    const findings = Object.freeze([
      makeFinding({ id: 'a', severity: 'info' }),
      makeFinding({ id: 'b', severity: 'critical' }),
      makeFinding({ id: 'c', severity: 'warning' }),
    ]);
    const result = sel.selectFindingsBySeverity(findings, 3);
    expect(result[0]!.id).toBe('b');
    expect(result[1]!.id).toBe('c');
    expect(result[2]!.id).toBe('a');
  });

  it('selectFindingsBySeverity uses id as tiebreaker', () => {
    const sel = new RetrievalSelection();
    const findings = Object.freeze([
      makeFinding({ id: 'b', severity: 'critical' }),
      makeFinding({ id: 'a', severity: 'critical' }),
    ]);
    const result = sel.selectFindingsBySeverity(findings, 2);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('b');
  });

  it('selectFindingsBySeverity limits to maxCount', () => {
    const sel = new RetrievalSelection();
    const findings = Object.freeze([
      makeFinding({ id: 'a', severity: 'critical' }),
      makeFinding({ id: 'b', severity: 'warning' }),
    ]);
    const result = sel.selectFindingsBySeverity(findings, 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('a');
  });

  it('interpolate ensures includeIds are first, then fills with remaining up to maxCount', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([
      makeEntry({ id: 'a' }),
      makeEntry({ id: 'b' }),
      makeEntry({ id: 'c' }),
      makeEntry({ id: 'd' }),
    ]);
    const result = sel.interpolate(entries, Object.freeze(['c', 'a']), 3);
    expect(result).toHaveLength(3);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('c');
    expect(result[2]!.id).toBe('b');
  });

  it('interpolate returns frozen array', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([makeEntry({ id: 'a' })]);
    const result = sel.interpolate(entries, Object.freeze(['a']), 1);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('interpolate preserves includeIds even if they appear after maxCount', () => {
    const sel = new RetrievalSelection();
    const entries = Object.freeze([
      makeEntry({ id: 'a' }),
      makeEntry({ id: 'b' }),
      makeEntry({ id: 'c' }),
    ]);
    const result = sel.interpolate(entries, Object.freeze(['c', 'b']), 2);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('b');
    expect(result[1]!.id).toBe('c');
  });
});
