import { describe, expect, it } from 'vitest';

import { createProviderGovernanceSnapshot,createProviderMessage, createProviderRequest } from '../contracts.ts';
import { ProviderGovernanceViolation } from '../errors/provider-errors.ts';
import { ProviderGovernance } from '../governance/provider-governance.ts';

function makeRequest(overrides?: Record<string, unknown>) {
  return createProviderRequest({
    provider: 'openai',
    model: 'gpt-4',
    messages: [createProviderMessage({ role: 'user', content: 'hello' })],
    temperature: 0,
    maxTokens: 100,
    ...overrides,
  });
}

describe('ProviderGovernance', () => {
  describe('getSnapshot', () => {
    it('returns default snapshot for unknown provider', () => {
      const gov = new ProviderGovernance();
      const snap = gov.getSnapshot('unknown', 'model');
      expect(snap.enabled).toBe(true);
      expect(snap.maxTokens).toBe(4096);
    });

    it('returns provider-specific snapshot when registered', () => {
      const gov = new ProviderGovernance();
      gov.registerProfile('openai', 'gpt-4', {
        maxTokens: 8000,
        maxContextTokens: 128000,
        temperature: 0.7,
        topP: 1,
        deterministic: false,
        allowedCategories: [],
        enabled: true,
      });
      const snap = gov.getSnapshot('openai', 'gpt-4');
      expect(snap.maxTokens).toBe(8000);
    });

    it('returns wildcard profile when no model match', () => {
      const gov = new ProviderGovernance();
      gov.registerProfile('openai', '*', {
        maxTokens: 4096, maxContextTokens: 128000,
        temperature: 0.7, topP: 1,
        deterministic: false, allowedCategories: [], enabled: true,
      });
      const snap = gov.getSnapshot('openai', 'unknown-model');
      expect(snap.maxTokens).toBe(4096);
    });

    it('returns frozen snapshot', () => {
      const gov = new ProviderGovernance();
      const snap = gov.getSnapshot('t', 'm');
      expect(Object.isFrozen(snap)).toBe(true);
    });
  });

  describe('enforce', () => {
    it('passes for valid request', () => {
      const gov = new ProviderGovernance();
      const snap = gov.getSnapshot('openai', 'gpt-4');
      expect(() => gov.enforce(makeRequest(), snap)).not.toThrow();
    });

    it('throws when provider disabled', () => {
      const gov = new ProviderGovernance();
      const snap = createProviderGovernanceSnapshot({
        provider: 'test', model: 'm', enabled: false,
      });
      expect(() => gov.enforce(makeRequest({ provider: 'test' }), snap))
        .toThrow(ProviderGovernanceViolation);
    });

    it('throws when maxTokens exceeded', () => {
      const gov = new ProviderGovernance();
      const snap = createProviderGovernanceSnapshot({
        provider: 't', model: 'm', maxTokens: 50,
      });
      expect(() => gov.enforce(makeRequest({ maxTokens: 100 }), snap))
        .toThrow(ProviderGovernanceViolation);
    });

    it('throws when context too large', () => {
      const gov = new ProviderGovernance();
      const snap = createProviderGovernanceSnapshot({
        provider: 't', model: 'm', maxContextTokens: 5,
      });
      expect(() => gov.enforce(makeRequest({
        messages: [createProviderMessage({ role: 'user', content: 'a'.repeat(10) })],
      }), snap)).toThrow(ProviderGovernanceViolation);
    });

    it('throws when deterministic mode requires temperature 0', () => {
      const gov = new ProviderGovernance();
      const snap = createProviderGovernanceSnapshot({
        provider: 't', model: 'm', deterministic: true,
      });
      expect(() => gov.enforce(makeRequest({ temperature: 0.5 }), snap))
        .toThrow(ProviderGovernanceViolation);
    });

    it('allows temperature 0 in deterministic mode', () => {
      const gov = new ProviderGovernance();
      const snap = createProviderGovernanceSnapshot({
        provider: 't', model: 'm', deterministic: true,
      });
      expect(() => gov.enforce(makeRequest({ temperature: 0 }), snap)).not.toThrow();
    });
  });

  describe('enforceDeterministicMode', () => {
    it('returns same snapshot when not deterministic', () => {
      const gov = new ProviderGovernance();
      const snap = createProviderGovernanceSnapshot({
        provider: 't', model: 'm', deterministic: false, temperature: 0.7,
      });
      const enforced = gov.enforceDeterministicMode(snap);
      expect(enforced.temperature).toBe(0.7);
    });

    it('forces temperature to 0 when deterministic', () => {
      const gov = new ProviderGovernance();
      const snap = createProviderGovernanceSnapshot({
        provider: 't', model: 'm', deterministic: true, temperature: 0.7,
      });
      const enforced = gov.enforceDeterministicMode(snap);
      expect(enforced.temperature).toBe(0);
      expect(enforced.topP).toBe(1);
    });
  });

  describe('registerProfile', () => {
    it('stores profile for later retrieval', () => {
      const gov = new ProviderGovernance();
      gov.registerProfile('anthropic', 'claude-3', {
        maxTokens: 4096, maxContextTokens: 200000,
        temperature: 0.5, topP: 1,
        deterministic: true, allowedCategories: [], enabled: true,
      });
      const snap = gov.getSnapshot('anthropic', 'claude-3');
      expect(snap.deterministic).toBe(true);
      expect(snap.maxContextTokens).toBe(200000);
    });
  });

  describe('isEnabled', () => {
    it('returns true by default', () => {
      const gov = new ProviderGovernance();
      expect(gov.isEnabled('t', 'm')).toBe(true);
    });

    it('returns false when profile disabled', () => {
      const gov = new ProviderGovernance();
      gov.registerProfile('t', 'm', {
        maxTokens: 4096, maxContextTokens: 128000,
        temperature: 0.7, topP: 1,
        deterministic: false, allowedCategories: [], enabled: false,
      });
      expect(gov.isEnabled('t', 'm')).toBe(false);
    });
  });
});
