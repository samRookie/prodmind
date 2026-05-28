import { describe, expect, it } from 'vitest';
import {
  classifyHotspotSeverity,
  classifyInstabilitySeverity,
  classifyDepthSeverity,
  combineSeverities,
  severityToNumeric,
} from '../../insights/insight-classifier.ts';

describe('InsightClassifier', () => {
  describe('classifyHotspotSeverity', () => {
    it('returns CRITICAL for high fan-in/out with utility hub', () => {
      expect(classifyHotspotSeverity(50, 50, true)).toBe('CRITICAL');
    });

    it('returns HIGH for moderate values', () => {
      expect(classifyHotspotSeverity(30, 10, false)).toBe('HIGH');
    });

    it('returns LOW for low values', () => {
      expect(classifyHotspotSeverity(5, 3, false)).toBe('LOW');
    });

    it('is deterministic', () => {
      const r1 = classifyHotspotSeverity(25, 30, true);
      const r2 = classifyHotspotSeverity(25, 30, true);
      expect(r1).toBe(r2);
    });
  });

  describe('classifyInstabilitySeverity', () => {
    it('returns CRITICAL for high score with inversion risk', () => {
      expect(classifyInstabilitySeverity(0.9, true, true)).toBe('CRITICAL');
    });

    it('returns HIGH for 0.6+', () => {
      expect(classifyInstabilitySeverity(0.7, false, false)).toBe('HIGH');
    });

    it('returns LOW for low scores', () => {
      expect(classifyInstabilitySeverity(0.1, false, false)).toBe('LOW');
    });
  });

  describe('classifyDepthSeverity', () => {
    it('returns CRITICAL for depth > 15', () => {
      expect(classifyDepthSeverity(20)).toBe('CRITICAL');
    });

    it('returns HIGH for depth > 10', () => {
      expect(classifyDepthSeverity(12)).toBe('HIGH');
    });

    it('returns MODERATE for depth > 5', () => {
      expect(classifyDepthSeverity(7)).toBe('MODERATE');
    });

    it('returns LOW for shallow depth', () => {
      expect(classifyDepthSeverity(2)).toBe('LOW');
    });
  });

  describe('combineSeverities', () => {
    it('returns the highest severity', () => {
      expect(combineSeverities(['LOW', 'HIGH', 'MODERATE'])).toBe('HIGH');
    });

    it('returns CRITICAL when present', () => {
      expect(combineSeverities(['LOW', 'CRITICAL'])).toBe('CRITICAL');
    });

    it('returns LOW for empty list', () => {
      expect(combineSeverities([])).toBe('LOW');
    });
  });

  describe('severityToNumeric', () => {
    it('maps LOW to 1', () => expect(severityToNumeric('LOW')).toBe(1));
    it('maps MODERATE to 2', () => expect(severityToNumeric('MODERATE')).toBe(2));
    it('maps HIGH to 3', () => expect(severityToNumeric('HIGH')).toBe(3));
    it('maps CRITICAL to 4', () => expect(severityToNumeric('CRITICAL')).toBe(4));
  });
});
