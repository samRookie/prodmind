import { describe, it, expect } from 'vitest';
import { SearchEngine } from '../../search/search-engine.ts';
import type { SearchIndexEntry } from '../../search/search-types.ts';

describe('SearchEngine', () => {
  it('searches by exact mode', () => {
    const engine = new SearchEngine();
    const entries: SearchIndexEntry[] = [
      { id: 'n1', label: 'core-module', description: '', type: 'module', subsystem: 'engine', fingerprint: 'fp1', tokens: ['core-module', 'core', 'module'] },
      { id: 'n2', label: 'utils-lib', description: '', type: 'library', subsystem: 'engine', fingerprint: 'fp2', tokens: ['utils-lib', 'utils', 'lib'] },
    ];
    engine.registerIndex({ searchType: 'NODE_SEARCH', entries, fingerprint: 'idx1' });
    const result = engine.search({ searchType: 'NODE_SEARCH', term: 'core-module', mode: 'EXACT', limit: 10, offset: 0 });
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.id).toBe('n1');
  });

  it('searches by prefix mode', () => {
    const engine = new SearchEngine();
    const entries: SearchIndexEntry[] = [
      { id: 'n1', label: 'core-module', description: '', type: 'module', subsystem: 'engine', fingerprint: 'fp1', tokens: ['core-module', 'core', 'module'] },
    ];
    engine.registerIndex({ searchType: 'NODE_SEARCH', entries, fingerprint: 'idx1' });
    const result = engine.search({ searchType: 'NODE_SEARCH', term: 'core', mode: 'PREFIX', limit: 10, offset: 0 });
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
  });

  it('searches by contains mode', () => {
    const engine = new SearchEngine();
    const entries: SearchIndexEntry[] = [
      { id: 'n1', label: 'core-module', description: '', type: 'module', subsystem: 'engine', fingerprint: 'fp1', tokens: ['core-module', 'core', 'module'] },
    ];
    engine.registerIndex({ searchType: 'NODE_SEARCH', entries, fingerprint: 'idx1' });
    const result = engine.search({ searchType: 'NODE_SEARCH', term: 'mod', mode: 'CONTAINS', limit: 10, offset: 0 });
    expect(result.matches.length).toBeGreaterThanOrEqual(1);
  });

  it('returns empty for no matches', () => {
    const engine = new SearchEngine();
    const entries: SearchIndexEntry[] = [
      { id: 'n1', label: 'core-module', description: '', type: 'module', subsystem: 'engine', fingerprint: 'fp1', tokens: ['core-module'] },
    ];
    engine.registerIndex({ searchType: 'NODE_SEARCH', entries, fingerprint: 'idx1' });
    const result = engine.search({ searchType: 'NODE_SEARCH', term: 'zzznonexistent', mode: 'EXACT', limit: 10, offset: 0 });
    expect(result.matches).toHaveLength(0);
  });

  it('handles empty query', () => {
    const engine = new SearchEngine();
    const result = engine.search({ searchType: 'NODE_SEARCH', term: '', mode: 'EXACT', limit: 10, offset: 0 });
    expect(result.matches).toHaveLength(0);
  });
});
