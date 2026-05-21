import { beforeEach,describe, expect, it } from 'vitest';

import type { AssemblyMetrics, AssemblyTrace, ContextAssemblyResult, ContextBudget, ContextSlice } from '../../context/contracts.ts';
import { PromptType } from '../../prompts/contracts/prompt-contracts.ts';
import { PromptExecutionPipeline } from '../../prompts/execution/prompt-execution-pipeline.ts';
import { PromptGovernance } from '../../prompts/governance/prompt-governance.ts';
import { MockProviderAdapter } from '../../prompts/providers/mock-provider.ts';
import { PromptRegistry } from '../../prompts/registry/prompt-registry.ts';

function makeMockContextResult(): ContextAssemblyResult {
  const budget: ContextBudget = Object.freeze({
    total: 10000,
    used: 5000,
    remaining: 5000,
    reserved: 1000,
    hardLimit: 16000,
    softLimit: 12000,
    isOverHard: false,
    isOverSoft: false,
  });
  const trace: AssemblyTrace = Object.freeze({
    entries: Object.freeze([]),
    totalDurationMs: 0,
    operationCount: 0,
  });
  const metrics: AssemblyMetrics = Object.freeze({
    totalRetrieved: 10,
    totalRanked: 8,
    totalSliced: 3,
    totalCompressed: 0,
    totalDeduped: 0,
    totalDiscarded: 2,
    finalTokenCount: 5000,
    budgetUtilization: 0.5,
    assemblyDurationMs: 100,
  });
  const slices: readonly ContextSlice[] = Object.freeze([
    Object.freeze({
      id: 's1',
      kind: 'local_neighborhood',
      strategy: 'DEPENDENCY_NEIGHBORHOOD',
      nodes: Object.freeze([]),
      edges: Object.freeze([]),
      regions: Object.freeze([]),
      chains: Object.freeze([]),
      tokenCount: 2000,
      metadata: Object.freeze({}),
    }),
  ]);
  return Object.freeze({
    request: Object.freeze({ snapshotId: 'snap-test', seedNodeIds: ['n1'] }),
    slices,
    budget,
    trace,
    metrics,
    fingerprint: 'ctx-fp-test',
    generatedAt: '2026-01-01T00:00:00.000Z',
  });
}

describe('PromptExecutionPipeline', () => {
  let registry: PromptRegistry;
  let governance: PromptGovernance;
  let provider: MockProviderAdapter;
  let pipeline: PromptExecutionPipeline;
  const testTemplate = 'Analyze {{snapshotId}} with {{sliceCount}} slices.\n\n{{#contextBlocks}}{{contextBlocks}}{{/contextBlocks}}';

  beforeEach(async () => {
    registry = new PromptRegistry();
    await registry.register({
      promptId: 'arch-review',
      promptType: PromptType.ANALYSIS,
      category: 'architecture_review',
      template: testTemplate,
    });
    await registry.publish('arch-review');

    governance = new PromptGovernance(registry, {
      strictMode: true,
      allowedCategories: ['architecture_review'],
    });

    provider = new MockProviderAdapter({ seed: 'test-seed' });
    pipeline = new PromptExecutionPipeline(registry, governance, provider);
  });

  it('executes a full pipeline and returns a valid result', async () => {
    const result = await pipeline.execute({
      promptId: 'arch-review',
      category: 'architecture_review',
      contextResult: makeMockContextResult(),
    });

    expect(result.request.promptId).toBe('arch-review');
    expect(result.promptEnvelope.promptId).toBe('arch-review');
    expect(result.contextEnvelope.sliceCount).toBe(1);
    expect(result.providerEnvelope.renderedPrompt.length).toBeGreaterThan(0);
    expect(result.responseEnvelope.text.length).toBeGreaterThan(0);
    expect(result.normalizedResponse.normalizedText.length).toBeGreaterThan(0);
    expect(result.structuredResult).not.toBeNull();
    expect(result.trace.operationCount).toBeGreaterThan(0);
    expect(result.metrics.selectedPromptId).toBe('arch-review');
    expect(result.fingerprint).toBeTruthy();
    expect(result.generatedAt).toBeTruthy();
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('produces deterministic results across two calls', async () => {
    const ctx = makeMockContextResult();
    const r1 = await pipeline.execute({ promptId: 'arch-review', category: 'architecture_review', contextResult: ctx });
    const r2 = await pipeline.execute({ promptId: 'arch-review', category: 'architecture_review', contextResult: ctx });
    expect(r1.responseEnvelope.text).toBe(r2.responseEnvelope.text);
    expect(r1.trace.operationCount).toBe(r2.trace.operationCount);
  });

  it('throws on unknown prompt', async () => {
    await expect(pipeline.execute({
      promptId: 'unknown',
      category: 'architecture_review',
      contextResult: makeMockContextResult(),
    })).rejects.toThrow();
  });

  it('rejects disallowed categories', async () => {
    await expect(pipeline.execute({
      promptId: 'arch-review',
      category: 'engineering_diagnostics',
      contextResult: makeMockContextResult(),
    })).rejects.toThrow();
  });
});
