import { describe, expect,it } from 'vitest';

import { createRequest } from '../../contracts/request.ts';

describe('AIRequest', () => {
  it('creates a request with all required fields', () => {
    const request = createRequest({
      prompt: 'Hello',
      correlationId: 'test-001',
    });

    expect(request.prompt).toBe('Hello');
    expect(request.correlationId).toBe('test-001');
  });

  it('applies default values for optional fields', () => {
    const request = createRequest({
      prompt: 'Hello',
    });

    expect(request.temperature).toBe(0.7);
    expect(request.topP).toBe(1);
    expect(request.maxTokens).toBe(4096);
    expect(request.stopSequences).toEqual([]);
    expect(request.tools).toEqual([]);
    expect(request.metadata).toEqual({});
    expect(request.correlationId).toBeDefined();
    expect(request.correlationId.length).toBeGreaterThan(0);
  });

  it('respects provided optional values', () => {
    const request = createRequest({
      prompt: 'Hello',
      temperature: 0.1,
      topP: 0.5,
      maxTokens: 100,
      stopSequences: ['\n'],
      tools: [{ name: 'test-tool' }],
      metadata: { key: 'value' },
      correlationId: 'custom-id',
    });

    expect(request.temperature).toBe(0.1);
    expect(request.topP).toBe(0.5);
    expect(request.maxTokens).toBe(100);
    expect(request.stopSequences).toEqual(['\n']);
    expect(request.tools).toEqual([{ name: 'test-tool' }]);
    expect(request.metadata).toEqual({ key: 'value' });
    expect(request.correlationId).toBe('custom-id');
  });

  it('auto-generates correlationId when not provided', () => {
    const request1 = createRequest({ prompt: 'Hello' });
    const request2 = createRequest({ prompt: 'Hello' });

    expect(request1.correlationId).toBeDefined();
    expect(request2.correlationId).toBeDefined();
    expect(request1.correlationId).not.toBe(request2.correlationId);
  });

  it('freezes the returned object', () => {
    const request = createRequest({
      prompt: 'Hello',
      correlationId: 'test-001',
    });

    expect(Object.isFrozen(request)).toBe(true);
  });

  it('prevents mutation of frozen request in strict mode', () => {
    const request = createRequest({
      prompt: 'Hello',
      correlationId: 'test-001',
    });

    expect(() => {
      (request as unknown as Record<string, unknown>).prompt = 'Modified';
    }).toThrow();
  });

  it('prevents reassignment of readonly fields', () => {
    const request = createRequest({
      prompt: 'Hello',
      correlationId: 'test-001',
    });

    expect(() => {
      (request as unknown as Record<string, unknown>).prompt = 'Modified';
    }).toThrow();
  });
});
