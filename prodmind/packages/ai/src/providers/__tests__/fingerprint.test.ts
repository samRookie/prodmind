import { describe, expect, it } from 'vitest';

import { createProviderMessage,createProviderRequest, createProviderResponse } from '../contracts.ts';
import { ProviderFingerprinter } from '../fingerprinting/provider-fingerprint.ts';

const fingerprinter = new ProviderFingerprinter();

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

function makeResponse(overrides?: Record<string, unknown>) {
  return createProviderResponse({
    provider: 'openai',
    model: 'gpt-4',
    text: 'response text',
    finishReason: 'stop',
    tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    ...overrides,
  });
}

describe('ProviderFingerprinter', () => {
  describe('fingerprintRequest', () => {
    it('produces deterministic hash for same input', async () => {
      const a = await fingerprinter.fingerprintRequest(makeRequest());
      const b = await fingerprinter.fingerprintRequest(makeRequest());
      expect(a.hash).toBe(b.hash);
    });

    it('produces different hash for different input', async () => {
      const a = await fingerprinter.fingerprintRequest(makeRequest());
      const b = await fingerprinter.fingerprintRequest(makeRequest({ temperature: 0.5 }));
      expect(a.hash).not.toBe(b.hash);
    });

    it('returns structured fingerprint with components', async () => {
      const fp = await fingerprinter.fingerprintRequest(makeRequest());
      expect(fp.hash).toHaveLength(64);
      expect(fp.components.provider).toBe('openai');
      expect(typeof fp.generatedAt).toBe('string');
    });

    it('fingerprint changes when messages change', async () => {
      const a = await fingerprinter.fingerprintRequest(makeRequest());
      const b = await fingerprinter.fingerprintRequest(makeRequest({
        messages: [createProviderMessage({ role: 'user', content: 'different' })],
      }));
      expect(a.hash).not.toBe(b.hash);
    });

    it('returns frozen components', async () => {
      const fp = await fingerprinter.fingerprintRequest(makeRequest());
      expect(Object.isFrozen(fp.components)).toBe(true);
    });
  });

  describe('fingerprintResponse', () => {
    it('produces deterministic hash for same response', async () => {
      const a = await fingerprinter.fingerprintResponse(makeResponse());
      const b = await fingerprinter.fingerprintResponse(makeResponse());
      expect(a.hash).toBe(b.hash);
    });

    it('produces different hash for different response text', async () => {
      const a = await fingerprinter.fingerprintResponse(makeResponse());
      const b = await fingerprinter.fingerprintResponse(makeResponse({ text: 'different' }));
      expect(a.hash).not.toBe(b.hash);
    });
  });

  describe('fingerprintRequestResponse', () => {
    it('produces composite fingerprint', async () => {
      const req = makeRequest();
      const res = makeResponse();
      const fp = await fingerprinter.fingerprintRequestResponse(req, res);
      expect(typeof fp).toBe('string');
      expect(fp).toHaveLength(64);
    });
  });

  describe('verifyRequest', () => {
    it('returns true for matching fingerprint', async () => {
      const req = makeRequest();
      const fp = await fingerprinter.fingerprintRequest(req);
      const verified = await fingerprinter.verifyRequest(req, fp.hash);
      expect(verified).toBe(true);
    });

    it('returns false for mismatched fingerprint', async () => {
      const req = makeRequest();
      const verified = await fingerprinter.verifyRequest(req, 'wronghash');
      expect(verified).toBe(false);
    });
  });

  describe('verifyResponse', () => {
    it('returns true for matching fingerprint', async () => {
      const res = makeResponse();
      const fp = await fingerprinter.fingerprintResponse(res);
      const verified = await fingerprinter.verifyResponse(res, fp.hash);
      expect(verified).toBe(true);
    });
  });

  describe('determinism (10 runs)', () => {
    it('produces identical request fingerprints across 10 runs', async () => {
      const hashes = await Promise.all(
        Array.from({ length: 10 }, () => fingerprinter.fingerprintRequest(makeRequest())),
      );
      const first = hashes[0]!.hash;
      for (const fp of hashes) {
        expect(fp.hash).toBe(first);
      }
    });

    it('produces identical response fingerprints across 10 runs', async () => {
      const hashes = await Promise.all(
        Array.from({ length: 10 }, () => fingerprinter.fingerprintResponse(makeResponse())),
      );
      const first = hashes[0]!.hash;
      for (const fp of hashes) {
        expect(fp.hash).toBe(first);
      }
    });
  });
});
