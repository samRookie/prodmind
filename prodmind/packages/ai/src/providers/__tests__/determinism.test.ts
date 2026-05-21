import { describe, expect, it } from 'vitest';

import { createProviderMessage, createProviderRequest, createProviderResponse } from '../contracts.ts';
import { ProviderFingerprinter } from '../fingerprinting/provider-fingerprint.ts';
import { ProviderGovernance } from '../governance/provider-governance.ts';
import { ProviderNormalizer } from '../normalization/provider-normalizer.ts';
import { ProviderValidator } from '../validation/provider-validation.ts';

const normalizer = new ProviderNormalizer();
const fingerprinter = new ProviderFingerprinter();
const governance = new ProviderGovernance();
const validator = new ProviderValidator();

function stableRequest() {
  return createProviderRequest({
    provider: 'deterministic-test',
    model: 'test-model',
    messages: [createProviderMessage({ role: 'user', content: 'What is 2+2?' })],
    temperature: 0,
    maxTokens: 100,
    topP: 1,
  });
}

function stableResponse() {
  return createProviderResponse({
    provider: 'deterministic-test',
    model: 'test-model',
    text: '4',
    finishReason: 'stop',
    tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    latencyMs: 100,
  });
}

describe('Provider Layer Determinism', () => {
  describe('Normalization', () => {
    it('produces identical requests for same input', () => {
      const a = normalizer.canonicalSerialize({
        prompt: 'hello',
        temp: 0.5,
      });
      const b = normalizer.canonicalSerialize({
        temp: 0.5,
        prompt: 'hello',
      });
      expect(a).toBe(b);
    });

    it('produces identical ProviderRequest for same AIRequest', () => {
      const req1 = normalizer.normalizeRequest({
        source: { prompt: 'test', correlationId: 'c1' },
        provider: 't', model: 'm',
      });
      const req2 = normalizer.normalizeRequest({
        source: { prompt: 'test', correlationId: 'c1' },
        provider: 't', model: 'm',
      });
      expect(req1.messages).toEqual(req2.messages);
      expect(req1.temperature).toBe(req2.temperature);
    });
  });

  describe('Fingerprinting', () => {
    it('produces identical hashes for identical requests (10 runs)', async () => {
      const req = stableRequest();
      const results = await Promise.all(
        Array.from({ length: 10 }, () => fingerprinter.fingerprintRequest(req)),
      );
      const first = results[0]!.hash;
      for (const fp of results) {
        expect(fp.hash).toBe(first);
      }
    });

    it('produces identical hashes for identical responses (10 runs)', async () => {
      const res = stableResponse();
      const results = await Promise.all(
        Array.from({ length: 10 }, () => fingerprinter.fingerprintResponse(res)),
      );
      const first = results[0]!.hash;
      for (const fp of results) {
        expect(fp.hash).toBe(first);
      }
    });

    it('request + response composite fingerprint is deterministic', async () => {
      const req = stableRequest();
      const res = stableResponse();
      const fp1 = await fingerprinter.fingerprintRequestResponse(req, res);
      const fp2 = await fingerprinter.fingerprintRequestResponse(req, res);
      expect(fp1).toBe(fp2);
    });
  });

  describe('Governance', () => {
    it('returns identical snapshots for same provider+model', () => {
      governance.registerProfile('det', 'm', {
        maxTokens: 100, maxContextTokens: 1000,
        temperature: 0, topP: 1, deterministic: true, allowedCategories: [], enabled: true,
      });
      const a = governance.getSnapshot('det', 'm');
      const b = governance.getSnapshot('det', 'm');
      expect(a.maxTokens).toBe(b.maxTokens);
      expect(a.deterministic).toBe(b.deterministic);
    });
  });

  describe('Validation', () => {
    it('produces identical validation results for same request', () => {
      const req = stableRequest();
      const a = validator.validateRequest(req);
      const b = validator.validateRequest(req);
      expect(a.valid).toBe(b.valid);
      expect(a.errors).toEqual(b.errors);
    });
  });

  describe('Cross-component determinism', () => {
    it('full cycle: normalize → fingerprint → validate → govern is replayable', async () => {
      const normalized = normalizer.normalizeRequest({
        source: { prompt: 'determinism check', correlationId: 'det-1' },
        provider: 'test', model: 'm',
      });

      const fp = await fingerprinter.fingerprintRequest(normalized);
      const validation = validator.validateRequest(normalized);
      const snap = governance.getSnapshot('test', 'm');

      expect(fp.hash).toHaveLength(64);
      expect(validation.valid).toBe(true);
      expect(snap.enabled).toBe(true);

      const normalized2 = normalizer.normalizeRequest({
        source: { prompt: 'determinism check', correlationId: 'det-1' },
        provider: 'test', model: 'm',
      });

      const fp2 = await fingerprinter.fingerprintRequest(normalized2);
      expect(fp2.hash).toBe(fp.hash);
    });
  });
});
