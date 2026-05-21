import { describe, expect,it } from 'vitest';

import { PromptType } from '../../prompts/contracts/prompt-contracts.ts';
import { PromptRegistry } from '../../prompts/registry/prompt-registry.ts';
import { ImmutablePromptError } from '../../prompts/registry/registry-errors.ts';
import { SIMPLE_TEMPLATE } from '../test-utils/sample-templates.ts';

describe('PromptRegistry', () => {
  const registry = new PromptRegistry();

  describe('register', () => {
    it('registers a new prompt with version 1', async () => {
      const prompt = await registry.register({
        promptId: 'test-greeting',
        promptType: PromptType.ANALYSIS,
        template: SIMPLE_TEMPLATE,
      });

      expect(prompt.promptId).toBe('test-greeting');
      expect(prompt.version).toBe(1);
      expect(prompt.status).toBe('draft');
      expect(prompt.checksum).toBeDefined();
      expect(prompt.checksum.length).toBeGreaterThan(0);
    });

    it('increments version for same promptId', async () => {
      const prompt = await registry.register({
        promptId: 'test-greeting',
        promptType: PromptType.ANALYSIS,
        template: 'Updated template {{name}}',
      });

      expect(prompt.version).toBe(2);
    });

    it('computes checksum from template and type', async () => {
      const p1 = await registry.register({
        promptId: 'checksum-test',
        promptType: PromptType.ANALYSIS,
        template: 'Same template {{var}}',
      });

      const p2 = await registry.register({
        promptId: 'checksum-test-2',
        promptType: PromptType.ANALYSIS,
        template: 'Same template {{var}}',
      });

      expect(p1.checksum).toBe(p2.checksum);
    });
  });

  describe('get / getLatest', () => {
    it('gets the latest version by default', async () => {
      const prompt = await registry.getLatest('test-greeting');
      expect(prompt?.version).toBe(2);
    });

    it('gets a specific version', async () => {
      const prompt = await registry.get('test-greeting', 1);
      expect(prompt?.version).toBe(1);
    });

    it('returns null for non-existent prompt', async () => {
      const prompt = await registry.get('non-existent');
      expect(prompt).toBeNull();
    });
  });

  describe('publish', () => {
    it('publishes a prompt', async () => {
      const prompt = await registry.publish('test-greeting', 1);
      expect(prompt.status).toBe('published');
    });

    it('immutability enforcement rejects published prompts', async () => {
      await expect(registry.enforceImmutability('test-greeting', 1)).rejects.toThrow(ImmutablePromptError);
    });

    it('allows modification of draft prompts', async () => {
      await expect(registry.enforceImmutability('test-greeting', 2)).resolves.not.toThrow();
    });
  });

  describe('deprecate', () => {
    it('deprecates a prompt', async () => {
      const prompt = await registry.deprecate('test-greeting', 1);
      expect(prompt.status).toBe('deprecated');
    });
  });

  describe('list', () => {
    it('lists all prompts', async () => {
      const all = await registry.list();
      expect(all.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('update', () => {
    it('creates a new version via update', async () => {
      const updated = await registry.update('test-greeting', 'New version {{name}}');
      expect(updated.version).toBe(3);
      expect(updated.template).toBe('New version {{name}}');
    });

    it('throws when updating published prompt', async () => {
      const lastDraft = await registry.update('test-greeting', 'publish me');
      await registry.publish('test-greeting', lastDraft.version);
      await expect(registry.update('test-greeting', 'should fail')).rejects.toThrow(ImmutablePromptError);
    });
  });
});
