import { describe, it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { RepositorySanitizer } from '../sanitizers/repository-sanitizer.ts';
import type { FileEntry } from '../types/sanitization.types.ts';

async function createTempDir(): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dirPath = join(tmpdir(), `test-sanitize-${randomUUID()}`);
  await mkdir(dirPath, { recursive: true });
  return {
    path: dirPath,
    cleanup: async () => {
      await rm(dirPath, { recursive: true, force: true });
    },
  };
}

async function writeFileIn(dir: string, name: string, content: string): Promise<void> {
  const fullPath = join(dir, name);
  const parent = fullPath.substring(0, fullPath.lastIndexOf('\\'));
  if (parent !== dir) {
    await mkdir(parent, { recursive: true });
  }
  await writeFile(fullPath, content, 'utf-8');
}

describe('RepositorySanitizer (integration)', () => {
  it('removes node_modules entries and classifies remaining files', async () => {
    const { path: dir, cleanup } = await createTempDir();
    try {
      const files: FileEntry[] = [
        { path: 'node_modules/lodash/index.js', sizeBytes: 50000 },
        { path: 'src/index.ts', sizeBytes: 1024 },
        { path: 'package.json', sizeBytes: 512 },
        { path: 'README.md', sizeBytes: 256 },
      ];

      const sanitizer = new RepositorySanitizer();
      const report = await sanitizer.sanitize(dir, files);

      expect(report.removedDirectories).toContain('node_modules');
      expect(report.removedBytes).toBe(50000);
      expect(report.retainedSourceBytes).toBe(1024 + 512 + 256);

      const classifiedPaths = report.classifiedFiles.map((f) => f.path);
      expect(classifiedPaths).not.toContain('node_modules/lodash/index.js');
      expect(classifiedPaths).toContain('src/index.ts');
    } finally {
      await cleanup();
    }
  });

  it('generates correct parse candidates', async () => {
    const { path: dir, cleanup } = await createTempDir();
    try {
      const files: FileEntry[] = [
        { path: 'src/app.ts', sizeBytes: 2000 },
        { path: 'README.md', sizeBytes: 500 },
        { path: 'pnpm-lock.yaml', sizeBytes: 100000 },
        { path: 'bin/tool.exe', sizeBytes: 50000 },
      ];

      const sanitizer = new RepositorySanitizer();
      const report = await sanitizer.sanitize(dir, files);

      expect(report.parseCandidates.length).toBeGreaterThan(0);
      const parsePaths = report.parseCandidates
        .filter((c) => c.shouldParse)
        .map((c) => c.path);
      expect(parsePaths).toContain('src/app.ts');
      expect(parsePaths).not.toContain('pnpm-lock.yaml');
      expect(parsePaths).not.toContain('bin/tool.exe');
    } finally {
      await cleanup();
    }
  });

  it('handles empty file list', async () => {
    const { path: dir, cleanup } = await createTempDir();
    try {
      const sanitizer = new RepositorySanitizer();
      const report = await sanitizer.sanitize(dir, []);

      expect(report.removedDirectories).toHaveLength(0);
      expect(report.ignoredFiles).toHaveLength(0);
      expect(report.classifiedFiles).toHaveLength(0);
      expect(report.parseCandidates).toHaveLength(0);
      expect(report.detectedSecrets).toHaveLength(0);
      expect(report.retainedSourceBytes).toBe(0);
      expect(report.removedBytes).toBe(0);
    } finally {
      await cleanup();
    }
  });

  it('detects secrets in source files', async () => {
    const { path: dir, cleanup } = await createTempDir();
    try {
      await writeFileIn(dir, 'src/config.ts', 'const awsKey = "AKIAIOSFODNN7EXAMPLE";');

      const files: FileEntry[] = [
        { path: 'src/config.ts', sizeBytes: 200 },
      ];

      const sanitizer = new RepositorySanitizer();
      const report = await sanitizer.sanitize(dir, files);

      expect(report.detectedSecrets.length).toBeGreaterThanOrEqual(1);
      expect(report.detectedSecrets[0]!.file).toBe('src/config.ts');
      expect(report.detectedSecrets[0]!.secretType).toBe('AWS_ACCESS_KEY');
    } finally {
      await cleanup();
    }
  });

  it('produces deterministic reports for same input', async () => {
    const { path: dir, cleanup } = await createTempDir();
    try {
      const files: FileEntry[] = [
        { path: 'a.ts', sizeBytes: 100 },
        { path: 'b.ts', sizeBytes: 200 },
      ];

      const sanitizer = new RepositorySanitizer();
      const r1 = await sanitizer.sanitize(dir, files);
      const r2 = await sanitizer.sanitize(dir, files);

      expect(r1.classifiedFiles).toEqual(r2.classifiedFiles);
      expect(r1.parseCandidates).toEqual(r2.parseCandidates);
      expect(r1.removedDirectories).toEqual(r2.removedDirectories);
    } finally {
      await cleanup();
    }
  });
});
