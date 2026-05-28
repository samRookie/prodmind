import { describe, it, expect } from 'vitest';
import { parseQuery } from '../../query/query-parser.ts';

describe('QueryParser', () => {
  it('parses a basic query', () => {
    const parsed = parseQuery({ type: 'NODE_QUERY' });
    expect(parsed.queryType).toBe('NODE_QUERY');
    expect(parsed.filters).toHaveLength(0);
    expect(parsed.limit).toBe(100);
  });

  it('parses filters', () => {
    const parsed = parseQuery({ type: 'NODE_QUERY', filters: [{ field: 'severity', comparator: 'EQ', value: 'CRITICAL' }] });
    expect(parsed.filters).toHaveLength(1);
    expect(parsed.filters[0]!.field).toBe('severity');
  });

  it('ignores invalid filters', () => {
    const parsed = parseQuery({ type: 'NODE_QUERY', filters: [{ field: '', comparator: 'INVALID', value: 'x' }] });
    expect(parsed.filters).toHaveLength(0);
  });

  it('parses limit and offset', () => {
    const parsed = parseQuery({ type: 'NODE_QUERY', limit: 10, offset: 20 });
    expect(parsed.limit).toBe(10);
    expect(parsed.offset).toBe(20);
  });

  it('caps limit at 1000', () => {
    const parsed = parseQuery({ type: 'NODE_QUERY', limit: 5000 });
    expect(parsed.limit).toBe(1000);
  });

  it('handles null/undefined gracefully', () => {
    const parsed = parseQuery(null as any);
    expect(parsed.queryType).toBe('NODE_QUERY');
  });
});
