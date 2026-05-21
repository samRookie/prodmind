import { describe, it, expect } from 'vitest';
import { MockProviderAdapter } from '../../prompts/providers/mock-provider.ts';

function makeEnvelope() {
  return {
    renderedPrompt: 'Test prompt',
    systemPrompt: undefined,
    constraints: {
      maxTokens: 4096,
      allowedCategories: Object.freeze([]),
      timeoutMs: 30000,
    },
    metadata: Object.freeze({}),
    fingerprint: 'test-fingerprint',
  };
}

describe('MockProviderAdapter', () => {
  it('returns a deterministic response with stop reason', async () => {
    const provider = new MockProviderAdapter({ seed: 'test' });
    const response = await provider.execute(makeEnvelope());
    expect(response.finishReason).toBe('stop');
    expect(response.text.length).toBeGreaterThan(0);
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('returns same response for same fingerprint', async () => {
    const provider = new MockProviderAdapter({ seed: 'test' });
    const r1 = await provider.execute(makeEnvelope());
    const r2 = await provider.execute(makeEnvelope());
    expect(r1.text).toBe(r2.text);
  });

  it('returns malformed response in malformed mode', async () => {
    const provider = new MockProviderAdapter({ failureMode: 'malformed' });
    const response = await provider.execute(makeEnvelope());
    expect(response.text).toBe('');
    expect(response.finishReason).toBe('error');
  });

  it('returns partial response in partial mode', async () => {
    const provider = new MockProviderAdapter({ failureMode: 'partial' });
    const response = await provider.execute(makeEnvelope());
    expect(response.finishReason).toBe('length');
    expect(response.metadata).toHaveProperty('truncated', true);
  });

  it('includes validation flag in validation_failure mode', async () => {
    const provider = new MockProviderAdapter({ failureMode: 'validation_failure' });
    const response = await provider.execute(makeEnvelope());
    expect(response.metadata).toHaveProperty('validationFailed', true);
  });

  it('throws on timeout mode', async () => {
    const provider = new MockProviderAdapter({ failureMode: 'timeout', simulatedLatencyMs: 1 });
    await expect(provider.execute(makeEnvelope())).rejects.toThrow('Mock provider timeout');
  });

  it('has correct capabilities', () => {
    const provider = new MockProviderAdapter();
    expect(provider.name).toBe('mock');
    expect(provider.capabilities.streaming).toBe(false);
    expect(provider.capabilities.structuredOutput).toBe(true);
  });
});
