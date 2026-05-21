import { describe, it, expect } from 'vitest';
import { PromptRegistry } from '../../prompts/registry/prompt-registry.ts';
import { PromptType } from '../../prompts/contracts/prompt-contracts.ts';
import { TemplateEngine } from '../../prompts/templates/template-engine.ts';
import { PromptValidator } from '../../prompts/validation/prompt-validator.ts';
import { GovernanceLayer } from '../../governance/governance-rules.ts';
import { createExecutionSnapshot } from '../../execution-history/execution-snapshot.ts';
import { ExecutionStore } from '../../execution-history/execution-store.ts';
import { createMockProvider } from '../../testing/mock-provider.ts';

describe('Prompt lifecycle integration', () => {
  const registry = new PromptRegistry();
  const engine = new TemplateEngine();
  const validator = new PromptValidator();
  const governance = new GovernanceLayer(registry);
  const store = new ExecutionStore();
  const provider = createMockProvider(42);

  it('full lifecycle: register → render → validate → execute → snapshot', async () => {
    const template = 'Analyze the following {{language}} code:\n```\n{{code}}\n```\n{{#context}}Context: {{context}}{{/context}}';

    const prompt = await registry.register({
      promptId: 'code-analysis',
      promptType: PromptType.ANALYSIS,
      template,
      metadata: { description: 'Code analysis prompt' },
    });

    expect(prompt.version).toBe(1);
    expect(prompt.status).toBe('draft');
    expect(prompt.metadata.description).toBe('Code analysis prompt');

    const preValidation = validator.validateBeforeRender(template);
    expect(preValidation.valid).toBe(true);

    const context = {
      language: 'TypeScript',
      code: 'const x: number = 1;',
      context: 'Simple variable declaration',
    };

    const rendered = await engine.render(template, context);
    expect(rendered.text).toContain('TypeScript');
    expect(rendered.text).toContain('const x: number = 1;');
    expect(rendered.text).toContain('Simple variable declaration');
    expect(rendered.fingerprint.length).toBe(64);

    const postValidation = await validator.validateAfterRender(template, context, 4000);
    expect(postValidation.valid).toBe(true);

    const executionGuard = await governance.validateExecutionPath('code-analysis');
    expect(executionGuard.valid).toBe(true);

    const request = { prompt: rendered.text, systemPrompt: 'You are a code reviewer.', temperature: 0.3, maxTokens: 500, correlationId: 'integrity-test-001' };
    const response = await provider.execute(request);

    expect(response.text).toBeDefined();
    expect(response.tokenUsage.totalTokens).toBeGreaterThan(0);

    const snapshot = await createExecutionSnapshot({
      correlationId: 'integrity-test-001',
      promptId: prompt.promptId,
      promptVersion: prompt.version,
      provider: provider.name,
      model: 'mock-model',
      renderedPrompt: rendered.text,
      systemPrompt: 'You are a code reviewer.',
      executionParams: { temperature: 0.3, maxTokens: 500 },
      response,
      status: 'success',
    });

    expect(snapshot.executionFingerprint).toBeDefined();
    expect(snapshot.replayFingerprint).toBeDefined();

    await store.save(snapshot);
    const stored = await store.findById(snapshot.id);
    expect(stored).not.toBeNull();
    expect(stored!.correlationId).toBe('integrity-test-001');
  });

  it('governance blocks execution of non-existent prompt', async () => {
    const result = await governance.validateExecutionPath('non-existent');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles template with missing variables gracefully', async () => {
    await expect(engine.render('Hello {{name}}', {} as Record<string, unknown>)).rejects.toThrow();
  });

  it('snapshot fingerprints are deterministic', async () => {
    const s1 = await createExecutionSnapshot({
      correlationId: 'det-1',
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'test',
      executionParams: { temp: 0.5 },
      response: { text: 'OK', tokenUsage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, latencyMs: 0, provider: 'mock', model: 'mock-model', finishReason: 'stop', toolCalls: [] },
    });

    const s2 = await createExecutionSnapshot({
      correlationId: 'det-2',
      provider: 'mock',
      model: 'mock-model',
      renderedPrompt: 'test',
      executionParams: { temp: 0.5 },
      response: { text: 'OK', tokenUsage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, latencyMs: 0, provider: 'mock', model: 'mock-model', finishReason: 'stop', toolCalls: [] },
    });

    expect(s1.executionFingerprint).toBe(s2.executionFingerprint);
    expect(s1.replayFingerprint).toBe(s2.replayFingerprint);
  });
});
