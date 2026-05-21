import { describe, it, expect } from 'vitest';
import { ResponseNormalizer } from '../../prompts/response/response-normalizer.ts';

describe('ResponseNormalizer', () => {
  const normalizer = new ResponseNormalizer();

  describe('normalize', () => {
    it('produces deterministic fingerprint for same text', async () => {
      const r1 = await normalizer.normalize('Hello World');
      const r2 = await normalizer.normalize('Hello World');
      expect(r1.fingerprint).toBe(r2.fingerprint);
      expect(Object.isFrozen(r1)).toBe(true);
    });
  });

  describe('toStructuredAnalysis', () => {
    it('extracts executive summary from text', () => {
      const text = 'Executive Summary\nThis is the summary.\n\nFindings\n- high: Critical issue found.';
      const result = normalizer.toStructuredAnalysis(text);
      expect(result.executiveSummary).toContain('This is the summary');
    });

    it('extracts findings from bullet points', () => {
      const text = 'Findings\n- high: Security issue\n- low: Minor issue';
      const result = normalizer.toStructuredAnalysis(text);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.findings[0]!.severity).toBe('high');
    });

    it('extracts confidence score', () => {
      const text = 'Confidence: 0.75';
      const result = normalizer.toStructuredAnalysis(text);
      expect(result.confidence).toBe(0.75);
    });

    it('returns 0 confidence when not found', () => {
      const result = normalizer.toStructuredAnalysis('No confidence here');
      expect(result.confidence).toBe(0);
    });

    it('returns frozen result', () => {
      const result = normalizer.toStructuredAnalysis('Test');
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.findings)).toBe(true);
      expect(Object.isFrozen(result.recommendations)).toBe(true);
    });
  });

  describe('createMetrics', () => {
    it('creates frozen metrics with all fields', () => {
      const metrics = normalizer.createMetrics({
        totalDurationMs: 100,
        selectedPromptId: 'test-prompt',
        selectedCategory: 'architecture_review',
        contextSliceCount: 3,
        contextTokenCount: 5000,
        renderedTokenCount: 2000,
        envelopeSizeBytes: 8000,
        providerLatencyMs: 50,
        normalizationDurationMs: 10,
        stageCount: 5,
      });
      expect(Object.isFrozen(metrics)).toBe(true);
      expect(metrics.totalDurationMs).toBe(100);
      expect(metrics.selectedCategory).toBe('architecture_review');
    });
  });
});
