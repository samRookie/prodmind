import { describe, it, expect, beforeAll } from 'vitest';
import { GovernanceLayer } from '../../governance/governance-rules.ts';
import { PromptRegistry } from '../../prompts/registry/prompt-registry.ts';
import { PromptType } from '../../prompts/contracts/prompt-contracts.ts';
import { ImmutablePromptError } from '../../governance/governance-errors.ts';

describe('GovernanceLayer', () => {
  const registry = new PromptRegistry();
  const governance = new GovernanceLayer(registry);

  beforeAll(async () => {
    await registry.register({
      promptId: 'gov-test',
      promptType: PromptType.ANALYSIS,
      template: 'Analyze {{code}}',
    });
  });

  describe('enforceImmutability', () => {
    it('allows draft prompt modification', async () => {
      await expect(governance.enforceImmutability('gov-test')).resolves.not.toThrow();
    });

    it('blocks published prompt modification', async () => {
      await registry.publish('gov-test');
      await expect(governance.enforceImmutability('gov-test')).rejects.toThrow(ImmutablePromptError);
    });
  });

  describe('getLatestVersion', () => {
    it('returns the latest version', async () => {
      const prompt = await governance.getLatestVersion('gov-test');
      expect(prompt.promptId).toBe('gov-test');
      expect(prompt.version).toBeGreaterThanOrEqual(1);
    });

    it('throws for non-existent prompt', async () => {
      await expect(governance.getLatestVersion('non-existent')).rejects.toThrow();
    });
  });

  describe('getCompatibleVersions', () => {
    it('returns non-deprecated versions', async () => {
      const versions = await governance.getCompatibleVersions('gov-test', 'mock', 'model');
      expect(versions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateExecutionPath', () => {
    it('validates published prompt passes', async () => {
      const result = await governance.validateExecutionPath('gov-test');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('rejects non-existent prompt', async () => {
      const result = await governance.validateExecutionPath('non-existent');
      expect(result.valid).toBe(false);
    });
  });
});
