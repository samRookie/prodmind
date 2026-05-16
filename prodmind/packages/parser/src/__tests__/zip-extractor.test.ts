import { describe, it, expect } from 'vitest';
import { ZipExtractor } from '../extractors/zip-extractor.ts';
import { CorruptedArchiveError } from '../extractors/extraction-errors.ts';
import { createTestZip } from './zip-fixtures.ts';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

describe('ZipExtractor', () => {
  describe('extract', () => {
    it('extracts a valid ZIP file with multiple entries', async () => {
      const fixture = await createTestZip([
        { path: 'file1.txt', content: 'hello' },
        { path: 'sub/file2.txt', content: 'world' },
      ]);

      try {
        const extractor = new ZipExtractor();
        const result = await extractor.extract(fixture.path);

        expect(result.extractedFiles).toBe(2);
        expect(result.extractedBytes).toBeGreaterThan(0);
        expect(result.skippedEntries).toBe(0);
        expect(result.failedEntries).toBe(0);
        expect(result.status).toBe('completed');
        expect(result.extractionId).toBeTruthy();
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
        expect(result.startedAt).toBeTruthy();
        expect(result.completedAt).toBeTruthy();

        const extractedFilePath = join(result.extractionPath, 'file1.txt');
        const content = await readFile(extractedFilePath, 'utf-8');
        expect(content).toBe('hello');
      } finally {
        await fixture.cleanup();
      }
    });

    it('handles non-existent ZIP file', async () => {
      const extractor = new ZipExtractor();
      await expect(
        extractor.extract('C:\\nonexistent\\test.zip'),
      ).rejects.toThrow(CorruptedArchiveError);
    });

    it('skips entries with path traversal', async () => {
      const fixture = await createTestZip([
        { path: 'safe.txt', content: 'hello' },
        { path: '../evil.txt', content: 'malicious' },
      ]);

      try {
        const extractor = new ZipExtractor();
        const result = await extractor.extract(fixture.path);

        expect(result.extractedFiles).toBe(1);
        expect(result.skippedEntries).toBe(1);
        expect(result.status).toBe('completed');
      } finally {
        await fixture.cleanup();
      }
    });

    it('skips entries with absolute path', async () => {
      const fixture = await createTestZip([
        { path: '/etc/passwd', content: 'fake' },
      ]);

      try {
        const extractor = new ZipExtractor();
        const result = await extractor.extract(fixture.path);

        expect(result.extractedFiles).toBe(0);
        expect(result.skippedEntries).toBe(1);
        expect(result.status).toBe('partial');
      } finally {
        await fixture.cleanup();
      }
    });

    it('skips entries with dangerous characters', async () => {
      const fixture = await createTestZip([
        { path: 'bad<file>.txt', content: 'dangerous' },
      ]);

      try {
        const extractor = new ZipExtractor();
        const result = await extractor.extract(fixture.path);

        expect(result.extractedFiles).toBe(0);
        expect(result.skippedEntries).toBe(1);
        expect(result.status).toBe('partial');
      } finally {
        await fixture.cleanup();
      }
    });

    it('handles empty ZIP file (no entries)', async () => {
      const fixture = await createTestZip([]);

      try {
        const extractor = new ZipExtractor();
        const result = await extractor.extract(fixture.path);

        expect(result.extractedFiles).toBe(0);
        expect(result.status).toBe('partial');
      } finally {
        await fixture.cleanup();
      }
    });

    it('enforces file count limit', async () => {
      const fixture = await createTestZip([
        { path: 'file0.txt', content: 'zero' },
        { path: 'file1.txt', content: 'one' },
        { path: 'file2.txt', content: 'two' },
      ]);

      try {
        const extractor = new ZipExtractor({
          maxFileCount: 2,
          maxExtractedSizeBytes: 1_000_000,
        });
        const result = await extractor.extract(fixture.path);

        expect(result.extractedFiles).toBe(2);
        expect(result.skippedEntries).toBe(1);
        expect(result.status).toBe('completed');
      } finally {
        await fixture.cleanup();
      }
    });

    it('enforces nesting depth limit', async () => {
      const fixture = await createTestZip([
        { path: 'a/b/c/d/file.txt', content: 'deep' },
        { path: 'a/b/file.txt', content: 'shallow' },
      ]);

      try {
        const extractor = new ZipExtractor({
          maxNestingDepth: 2,
          maxFileCount: 10,
          maxExtractedSizeBytes: 1_000_000,
        });
        const result = await extractor.extract(fixture.path);

        expect(result.extractedFiles).toBe(1);
        expect(result.skippedEntries).toBe(1);
        expect(result.status).toBe('completed');
      } finally {
        await fixture.cleanup();
      }
    });
  });

  describe('extractWithCleanup', () => {
    it('delegates to extract and returns result', async () => {
      const fixture = await createTestZip([
        { path: 'file.txt', content: 'test' },
      ]);

      try {
        const extractor = new ZipExtractor();
        const result = await extractor.extractWithCleanup(fixture.path);

        expect(result.extractedFiles).toBe(1);
        expect(result.status).toBe('completed');
      } finally {
        await fixture.cleanup();
      }
    });
  });
});
