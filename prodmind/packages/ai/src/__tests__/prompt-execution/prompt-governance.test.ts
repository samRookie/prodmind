import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRegistry } from '../../prompts/registry/prompt-registry.ts';
import { PromptGovernance } from '../../prompts/governance/prompt-governance.ts';
import { PromptType } from '../../prompts/contracts/prompt-contracts.ts';

describe('PromptGovernance', () => {
  let registry: PromptRegistry;
  let governance: PromptGovernance;

  beforeEach(() => {
    registry = new PromptRegistry();
    governance = new PromptGovernance(registry, {
      strictMode: true,
      allowedCategories: ['architecture_review', 'scalability_analysis'],
      maxPromptSize: 1000,
    });
  });

  it('rejects unknown prompts', async () => {
    const result = await governance.validatePromptSelection('unknown-prompt', 'architecture_review');
    expect(result.valid).toBe(false);
    expect(result.violations[0]!.code).toBe('PROMPT_NOT_FOUND');
  });

  it('rejects prompts that are not published', async () => {
    await registry.register({
      promptId: 'test-prompt',
      promptType: PromptType.ANALYSIS,
      template: 'Test template {{var}}',
    });
    const result = await governance.validatePromptSelection('test-prompt', 'architecture_review');
    expect(result.valid).toBe(false);
    expect(result.violations[0]!.code).toBe('PROMPT_NOT_PUBLISHED');
  });

  it('accepts published prompts in allowed categories', async () => {
    await registry.register({
      promptId: 'test-prompt',
      promptType: PromptType.ANALYSIS,
      template: 'Test template {{var}}',
    });
    await registry.publish('test-prompt');
    const result = await governance.validatePromptSelection('test-prompt', 'architecture_review');
    expect(result.valid).toBe(true);
  });

  it('rejects disallowed categories', async () => {
    await registry.register({
      promptId: 'test-prompt',
      promptType: PromptType.ANALYSIS,
      template: 'Test {{var}}',
    });
    await registry.publish('test-prompt');
    const result = await governance.validatePromptSelection('test-prompt', 'engineering_diagnostics');
    expect(result.valid).toBe(false);
    expect(result.violations[0]!.code).toBe('CATEGORY_NOT_ALLOWED');
  });

  it('rejects oversized prompts in strict mode', async () => {
    const bigTemplate = 'x'.repeat(1001);
    await registry.register({
      promptId: 'big-prompt',
      promptType: PromptType.ANALYSIS,
      template: bigTemplate,
    });
    await registry.publish('big-prompt');
    const result = await governance.validatePromptSelection('big-prompt', 'architecture_review');
    expect(result.valid).toBe(false);
    expect(result.violations[0]!.code).toBe('PROMPT_TOO_LARGE');
  });

  it('provides frozen config', () => {
    const config = governance.getConfig();
    expect(Object.isFrozen(config)).toBe(true);
    expect(config.strictMode).toBe(true);
  });
});
