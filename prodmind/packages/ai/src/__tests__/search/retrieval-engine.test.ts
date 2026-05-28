import { describe, it, expect } from 'vitest';
import { RetrievalEngine } from '../../search/retrieval-engine.ts';
import type { SearchIndexEntry } from '../../search/search-types.ts';

describe('RetrievalEngine', () => {
  it('retrieves by type', () => {
    const engine = new RetrievalEngine();
    const items: SearchIndexEntry[] = [
      { id: 'r1', label: 'Risk 1', description: '', type: 'risk', severity: 'CRITICAL', fingerprint: 'fp1', tokens: [] },
      { id: 'r2', label: 'Risk 2', description: '', type: 'risk', severity: 'HIGH', fingerprint: 'fp2', tokens: [] },
      { id: 'n1', label: 'Node 1', description: '', type: 'node', fingerprint: 'fp3', tokens: [] },
    ];
    engine.register(items);
    const results = engine.retrieve({ types: ['risk'], limit: 10, offset: 0 });
    expect(results.data).toHaveLength(2);
  });

  it('returns all items when no type filter (empty types)', () => {
    const engine = new RetrievalEngine();
    const items: SearchIndexEntry[] = [
      { id: 'r1', label: 'Risk 1', description: '', type: 'risk', fingerprint: 'fp1', tokens: [] },
    ];
    engine.register(items);
    const results = engine.retrieve({ types: [], limit: 10, offset: 0 });
    expect(results.data).toHaveLength(0);
  });

  it('supports limit', () => {
    const engine = new RetrievalEngine();
    const items: SearchIndexEntry[] = [
      { id: 'r1', label: 'Risk 1', description: '', type: 'risk', fingerprint: 'fp1', tokens: [] },
      { id: 'r2', label: 'Risk 2', description: '', type: 'risk', fingerprint: 'fp2', tokens: [] },
    ];
    engine.register(items);
    const results = engine.retrieve({ types: ['risk'], limit: 1, offset: 0 });
    expect(results.data).toHaveLength(1);
  });

  it('returns empty for unknown type', () => {
    const engine = new RetrievalEngine();
    const items: SearchIndexEntry[] = [
      { id: 'r1', label: 'Risk 1', description: '', type: 'risk', fingerprint: 'fp1', tokens: [] },
    ];
    engine.register(items);
    const results = engine.retrieve({ types: ['nonexistent'], limit: 10, offset: 0 });
    expect(results.data).toHaveLength(0);
  });
});
