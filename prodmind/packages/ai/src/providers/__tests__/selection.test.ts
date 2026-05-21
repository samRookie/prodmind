import { describe, expect, it } from 'vitest';

import type { ProviderCapability } from '../selection/provider-selector.ts';
import { ProviderSelector } from '../selection/provider-selector.ts';

function testCaps(): ProviderCapability[] {
  return [
    { provider: 'openai', model: 'gpt-4', maxTokens: 4096, maxContextTokens: 128000, costPer1K: 0.03, deterministic: false, categories: ['general', 'code'], priority: 1 },
    { provider: 'groq', model: 'mixtral', maxTokens: 4096, maxContextTokens: 32768, costPer1K: 0, deterministic: false, categories: ['general'], priority: 3 },
    { provider: 'local', model: 'qwen2.5:7b', maxTokens: 4096, maxContextTokens: 32768, costPer1K: 0.001, deterministic: true, categories: ['general', 'code'], priority: 5 },
  ];
}

describe('ProviderSelector', () => {
  describe('select', () => {
    it('returns first-available by default', () => {
      const s = new ProviderSelector(testCaps());
      const result = s.select({});
      expect(result.provider).toBe('openai');
      expect(result.model).toBe('gpt-4');
      expect(result.reason).toContain('First available');
    });

    it('returns cheapest strategy', () => {
      const s = new ProviderSelector(testCaps());
      const result = s.select({}, 'cheapest');
      expect(result.provider).toBe('groq');
      expect(result.reason).toContain('Cheapest');
    });

    it('returns deterministic strategy', () => {
      const s = new ProviderSelector(testCaps());
      const result = s.select({}, 'deterministic');
      expect(result.provider).toBe('local');
      expect(result.reason).toContain('Deterministic');
    });

    it('returns preferred provider when available', () => {
      const s = new ProviderSelector(testCaps());
      const result = s.select({ preferredProvider: 'groq' }, 'preferred');
      expect(result.provider).toBe('groq');
      expect(result.reason).toContain('Preferred');
    });

    it('filters by preferredProvider', () => {
      const s = new ProviderSelector(testCaps());
      const result = s.select({ preferredProvider: 'local' });
      expect(result.provider).toBe('local');
    });

    it('filters by preferredModel', () => {
      const s = new ProviderSelector(testCaps());
      const result = s.select({ preferredModel: 'qwen2.5:7b' });
      expect(result.provider).toBe('local');
    });

    it('filters by minTokens', () => {
      const caps: ProviderCapability[] = [
        { provider: 'a', model: 'm1', maxTokens: 1000, maxContextTokens: 4000, costPer1K: 0, deterministic: false, categories: [], priority: 1 },
        { provider: 'b', model: 'm2', maxTokens: 8000, maxContextTokens: 16000, costPer1K: 0, deterministic: false, categories: [], priority: 2 },
      ];
      const s = new ProviderSelector(caps);
      const result = s.select({ minTokens: 2000 });
      expect(result.provider).toBe('b');
    });

    it('filters by requireDeterministic', () => {
      const s = new ProviderSelector(testCaps());
      const result = s.select({ requireDeterministic: true });
      expect(result.provider).toBe('local');
    });

    it('returns none result when no match', () => {
      const s = new ProviderSelector([]);
      const result = s.select({});
      expect(result.provider).toBe('none');
      expect(result.reason).toContain('No provider matches');
    });

    it('returns frozen selection result', () => {
      const s = new ProviderSelector(testCaps());
      const result = s.select({});
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('getCapabilities', () => {
    it('returns default capabilities when none provided', () => {
      const s = new ProviderSelector();
      const caps = s.getCapabilities();
      expect(caps.length).toBeGreaterThan(0);
      expect(caps.length).toBe(7);
    });
  });
});
