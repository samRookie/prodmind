import { describe, it, expect } from 'vitest';
import { ExtractionLimits, DEFAULT_EXTRACTION_LIMITS, MAX_NESTING_DEPTH } from '../extractors/extraction-limits.ts';
import {
  MAX_UPLOAD_SIZE_MB,
  MAX_EXTRACTION_SIZE_MB,
  MAX_FILE_COUNT,
} from '@prodmind/core/runtime';
import { ExtractionLimitError } from '../extractors/extraction-errors.ts';

describe('DEFAULT_EXTRACTION_LIMITS', () => {
  it('has correct default values matching core constants', () => {
    expect(DEFAULT_EXTRACTION_LIMITS.maxZipSizeBytes).toBe(MAX_UPLOAD_SIZE_MB * 1024 * 1024);
    expect(DEFAULT_EXTRACTION_LIMITS.maxExtractedSizeBytes).toBe(MAX_EXTRACTION_SIZE_MB * 1024 * 1024);
    expect(DEFAULT_EXTRACTION_LIMITS.maxFileCount).toBe(MAX_FILE_COUNT);
    expect(DEFAULT_EXTRACTION_LIMITS.maxNestingDepth).toBe(MAX_NESTING_DEPTH);
  });
});

describe('ExtractionLimits', () => {
  it('uses defaults when no config provided', () => {
    const limits = new ExtractionLimits();
    expect(limits.config_).toEqual(DEFAULT_EXTRACTION_LIMITS);
  });

  it('merges custom config with defaults', () => {
    const limits = new ExtractionLimits({ maxFileCount: 5, maxNestingDepth: 3 });
    expect(limits.config_.maxFileCount).toBe(5);
    expect(limits.config_.maxNestingDepth).toBe(3);
    expect(limits.config_.maxZipSizeBytes).toBe(DEFAULT_EXTRACTION_LIMITS.maxZipSizeBytes);
  });

  describe('checkZipSize', () => {
    it('passes for size within limit', () => {
      const limits = new ExtractionLimits();
      expect(() => limits.checkZipSize(1024)).not.toThrow();
    });

    it('throws ExtractionLimitError for oversized ZIP', () => {
      const limits = new ExtractionLimits({ maxZipSizeBytes: 100 });
      expect(() => limits.checkZipSize(200)).toThrow(ExtractionLimitError);
    });
  });

  describe('checkEntryAllowed', () => {
    it('passes for valid entry within limits', () => {
      const limits = new ExtractionLimits({
        maxFileCount: 10,
        maxExtractedSizeBytes: 10000,
        maxNestingDepth: 5,
      });
      expect(() => limits.checkEntryAllowed('file.txt', 1000, 0)).not.toThrow();
    });

    it('throws ExtractionLimitError when file count exceeded', () => {
      const limits = new ExtractionLimits({
        maxFileCount: 1,
        maxExtractedSizeBytes: 10000,
        maxNestingDepth: 5,
      });
      limits.recordExtracted(100);
      expect(() => limits.checkEntryAllowed('file2.txt', 100, 0)).toThrow(ExtractionLimitError);
    });

    it('throws ExtractionLimitError when nesting depth exceeded', () => {
      const limits = new ExtractionLimits({
        maxFileCount: 10,
        maxExtractedSizeBytes: 10000,
        maxNestingDepth: 3,
      });
      expect(() => limits.checkEntryAllowed('a/b/c/d/file.txt', 100, 4)).toThrow(ExtractionLimitError);
    });

    it('throws ExtractionLimitError when extracted size exceeded', () => {
      const limits = new ExtractionLimits({
        maxFileCount: 10,
        maxExtractedSizeBytes: 1000,
        maxNestingDepth: 5,
      });
      limits.recordExtracted(800);
      expect(() => limits.checkEntryAllowed('file.txt', 300, 0)).toThrow(ExtractionLimitError);
    });
  });

  describe('recordExtracted', () => {
    it('updates totalExtractedFiles and totalExtractedBytes', () => {
      const limits = new ExtractionLimits();
      limits.recordExtracted(500);
      expect(limits.totalExtractedFiles).toBe(1);
      expect(limits.totalExtractedBytes).toBe(500);

      limits.recordExtracted(300);
      expect(limits.totalExtractedFiles).toBe(2);
      expect(limits.totalExtractedBytes).toBe(800);
    });
  });

  describe('wouldExceedLimits', () => {
    it('returns allowed when within limits', () => {
      const limits = new ExtractionLimits({
        maxFileCount: 10,
        maxExtractedSizeBytes: 10000,
        maxNestingDepth: 5,
      });
      expect(limits.wouldExceedLimits('file.txt', 1000, 0)).toEqual({ allowed: true });
    });

    it('returns not allowed when file count exceeded', () => {
      const limits = new ExtractionLimits({
        maxFileCount: 1,
        maxExtractedSizeBytes: 10000,
        maxNestingDepth: 5,
      });
      limits.recordExtracted(100);
      const result = limits.wouldExceedLimits('file2.txt', 100, 0);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('max file count');
    });

    it('returns not allowed when nesting depth exceeded', () => {
      const limits = new ExtractionLimits({
        maxFileCount: 10,
        maxExtractedSizeBytes: 10000,
        maxNestingDepth: 2,
      });
      const result = limits.wouldExceedLimits('a/b/c/file.txt', 100, 3);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('max nesting depth');
    });

    it('returns not allowed when extracted size exceeded', () => {
      const limits = new ExtractionLimits({
        maxFileCount: 10,
        maxExtractedSizeBytes: 1000,
        maxNestingDepth: 5,
      });
      limits.recordExtracted(800);
      const result = limits.wouldExceedLimits('file.txt', 300, 0);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('max extracted size');
    });
  });
});
