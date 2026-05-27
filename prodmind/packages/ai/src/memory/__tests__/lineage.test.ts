import { describe, it, expect } from 'vitest';
import { ExecutionLineage } from '../execution/execution-lineage.ts';

describe('ExecutionLineage', () => {
  it('records a lineage entry', () => {
    const lineage = new ExecutionLineage();
    const entry = lineage.recordEntry({
      providerUsed: 'openai',
      orchestrationPath: ['step1', 'step2'],
    });
    expect(entry.executionId).toBeTruthy();
    expect(entry.providerUsed).toBe('openai');
    expect(entry.orchestrationPath).toEqual(['step1', 'step2']);
    expect(lineage.getCount).toBe(1);
  });

  it('tracks parent-child relationships', () => {
    const lineage = new ExecutionLineage();
    const parent = lineage.recordEntry({ providerUsed: 'anthropic' });
    const child = lineage.recordEntry({
      parentExecutionId: parent.executionId,
      providerUsed: 'openai',
    });
    expect(child.parentExecutionId).toBe(parent.executionId);
    const children = lineage.getChildren(parent.executionId);
    expect(children).toHaveLength(1);
    expect(children[0]!.executionId).toBe(child.executionId);
  });

  it('returns ancestors', () => {
    const lineage = new ExecutionLineage();
    const root = lineage.recordEntry({ providerUsed: 'a' });
    const mid = lineage.recordEntry({ parentExecutionId: root.executionId, providerUsed: 'b' });
    const leaf = lineage.recordEntry({ parentExecutionId: mid.executionId, providerUsed: 'c' });
    const ancestors = lineage.getAncestors(leaf.executionId);
    expect(ancestors).toHaveLength(2);
    expect(ancestors[0]!.executionId).toBe(mid.executionId);
    expect(ancestors[1]!.executionId).toBe(root.executionId);
  });

  it('returns descendants', () => {
    const lineage = new ExecutionLineage();
    const root = lineage.recordEntry({ providerUsed: 'a' });
    const child1 = lineage.recordEntry({ parentExecutionId: root.executionId, providerUsed: 'b' });
    lineage.recordEntry({ parentExecutionId: root.executionId, providerUsed: 'c' });
    lineage.recordEntry({ parentExecutionId: child1.executionId, providerUsed: 'd' });
    const descendants = lineage.getDescendants(root.executionId);
    expect(descendants).toHaveLength(3);
  });

  it('filters by provider', () => {
    const lineage = new ExecutionLineage();
    lineage.recordEntry({ providerUsed: 'openai' });
    lineage.recordEntry({ providerUsed: 'anthropic' });
    lineage.recordEntry({ providerUsed: 'openai' });
    const openaiEntries = lineage.getProviderUsage('openai');
    expect(openaiEntries).toHaveLength(2);
  });

  it('handles upstream dependencies', () => {
    const lineage = new ExecutionLineage();
    const entry = lineage.recordEntry({
      upstreamDependencyIds: ['dep1', 'dep2'],
    });
    expect(entry.upstreamDependencyIds).toEqual(['dep1', 'dep2']);
  });

  it('handles replay ancestry', () => {
    const lineage = new ExecutionLineage();
    const entry = lineage.recordEntry({
      replayAncestry: ['replay1', 'replay2'],
    });
    expect(entry.replayAncestry).toEqual(['replay1', 'replay2']);
  });

  it('clears all entries', () => {
    const lineage = new ExecutionLineage();
    lineage.recordEntry({ providerUsed: 'openai' });
    lineage.recordEntry({ providerUsed: 'anthropic' });
    expect(lineage.getCount).toBe(2);
    lineage.clear();
    expect(lineage.getCount).toBe(0);
  });

  it('provides stable iteration order', () => {
    const lineage = new ExecutionLineage();
    const e1 = lineage.recordEntry({ providerUsed: 'z' });
    const e2 = lineage.recordEntry({ providerUsed: 'a' });
    const entries = lineage.entries;
    expect(entries[0]!.executionId).toBe(e1.executionId);
    expect(entries[1]!.executionId).toBe(e2.executionId);
  });
});
