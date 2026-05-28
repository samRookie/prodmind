import { describe, it, expect } from 'vitest';
import { QueryPlanner } from '../../query/query-planner.ts';
import { parseQuery } from '../../query/query-parser.ts';

describe('QueryPlanner', () => {
  const emptyNodes = { nodes: [] } as const;
  const emptyRisks = { risks: [] } as const;
  const twoNodes = { nodes: [{ id: 'n1' }, { id: 'n2' }] } as const;

  it('plans NODE_QUERY with node index', () => {
    const planner = new QueryPlanner();
    const query = parseQuery({ type: 'NODE_QUERY' });
    const plan = planner.plan(query, emptyNodes as never);
    expect(plan.indexUsage).toContain('node_index');
  });

  it('plans RISK_QUERY with risk index', () => {
    const planner = new QueryPlanner();
    const query = parseQuery({ type: 'RISK_QUERY' });
    const plan = planner.plan(query, emptyRisks as never);
    expect(plan.indexUsage).toContain('risk_index');
  });

  it('produces estimated rows', () => {
    const planner = new QueryPlanner();
    const query = parseQuery({ type: 'NODE_QUERY', limit: 10 });
    const plan = planner.plan(query, twoNodes as never);
    expect(plan.estimatedRows).toBeGreaterThan(0);
  });
});
