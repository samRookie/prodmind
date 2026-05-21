import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRegistry } from '../../prompts/registry/prompt-registry.ts';
import { PromptGovernance } from '../../prompts/governance/prompt-governance.ts';
import { MockProviderAdapter } from '../../prompts/providers/mock-provider.ts';
import { PromptExecutionPipeline } from '../../prompts/execution/prompt-execution-pipeline.ts';
import { PromptType } from '../../prompts/contracts/prompt-contracts.ts';
import type { ContextAssemblyResult, ContextBudget, AssemblyTrace, AssemblyMetrics, ContextSlice } from '../../context/contracts.ts';

function makeDeterministicContext(): ContextAssemblyResult {
  const budget: ContextBudget = Object.freeze({
    total: 5000, used: 2000, remaining: 3000, reserved: 500,
    hardLimit: 16000, softLimit: 12000, isOverHard: false, isOverSoft: false,
  });
  const trace: AssemblyTrace = Object.freeze({ entries: Object.freeze([]), totalDurationMs: 0, operationCount: 0 });
  const metrics: AssemblyMetrics = Object.freeze({
    totalRetrieved: 5, totalRanked: 4, totalSliced: 2, totalCompressed: 0,
    totalDeduped: 0, totalDiscarded: 1, finalTokenCount: 2000,
    budgetUtilization: 0.4, assemblyDurationMs: 50,
  });
  const slices: readonly ContextSlice[] = Object.freeze([
    Object.freeze({
      id: 's1', kind: 'local_neighborhood', strategy: 'DEPENDENCY_NEIGHBORHOOD',
      nodes: Object.freeze([]), edges: Object.freeze([]), regions: Object.freeze([]),
      chains: Object.freeze([]), tokenCount: 1000, metadata: Object.freeze({}),
    }),
  ]);
  return Object.freeze({
    request: Object.freeze({ snapshotId: 'snap-det', seedNodeIds: ['n1'] }),
    slices, budget, trace, metrics,
    fingerprint: 'ctx-fp-det', generatedAt: '2026-01-01T00:00:00.000Z',
  });
}

describe('Execution determinism (50-run fingerprint)', () => {
  let pipeline: PromptExecutionPipeline;

  beforeEach(async () => {
    const registry = new PromptRegistry();
    await registry.register({
      promptId: 'det-prompt',
      promptType: PromptType.ANALYSIS,
      category: 'architecture_review',
      template: 'Analyze {{snapshotId}} with {{sliceCount}} slices.',
    });
    await registry.publish('det-prompt');

    const governance = new PromptGovernance(registry, {
      strictMode: true,
      allowedCategories: ['architecture_review'],
    });
    const provider = new MockProviderAdapter({ seed: 'deterministic' });
    pipeline = new PromptExecutionPipeline(registry, governance, provider);
  });

  it('produces identical response text across 50 runs', async () => {
    const ctx = makeDeterministicContext();
    const responseTexts = new Set<string>();

    for (let i = 0; i < 50; i++) {
      const result = await pipeline.execute({
        promptId: 'det-prompt',
        category: 'architecture_review',
        contextResult: ctx,
      });
      responseTexts.add(result.responseEnvelope.text);
    }

    expect(responseTexts.size).toBe(1);
  });
});
