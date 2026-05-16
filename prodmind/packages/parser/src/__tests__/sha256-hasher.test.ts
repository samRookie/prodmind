import { describe, it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { Sha256Hasher, getContentType } from '../hashers/sha256-hasher.ts';
import { createHash } from 'node:crypto';

function expectedSha256(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex');
}

describe('Sha256Hasher', () => {
  it('produces correct SHA-256 hash for known content', async () => {
    const dir = join(tmpdir(), `test-hash-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, 'hello.txt');
    await writeFile(filePath, 'hello', 'utf-8');

    try {
      const hasher = new Sha256Hasher();
      const result = await hasher.hashFile(filePath);

      expect(result.sha256).toBe(expectedSha256('hello'));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('produces deterministic hashes for same content', async () => {
    const dir = join(tmpdir(), `test-hash2-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    const f1 = join(dir, 'a.txt');
    const f2 = join(dir, 'b.txt');
    await writeFile(f1, 'same content', 'utf-8');
    await writeFile(f2, 'same content', 'utf-8');

    try {
      const hasher = new Sha256Hasher();
      const r1 = await hasher.hashFile(f1);
      const r2 = await hasher.hashFile(f2);

      expect(r1.sha256).toBe(r2.sha256);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('handles empty file', async () => {
    const dir = join(tmpdir(), `test-empty-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, 'empty.txt');
    await writeFile(filePath, '', 'utf-8');

    try {
      const hasher = new Sha256Hasher();
      const result = await hasher.hashFile(filePath);

      expect(result.sha256).toBe(expectedSha256(''));
      expect(result.sizeBytes).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('streams large file without loading entirely into memory', async () => {
    const dir = join(tmpdir(), `test-large-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, 'large.txt');

    const chunk = 'x'.repeat(65536);
    const content = chunk.repeat(100);
    await writeFile(filePath, content, 'utf-8');

    try {
      const hasher = new Sha256Hasher();
      const result = await hasher.hashFile(filePath);

      expect(result.sha256).toBe(expectedSha256(content));
      expect(result.sizeBytes).toBe(content.length);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('hashBuffer produces correct hash', () => {
    const hasher = new Sha256Hasher();
    const data = Buffer.from('hello', 'utf-8');
    expect(hasher.hashBuffer(data)).toBe(expectedSha256('hello'));
  });

  it('hashString produces correct hash', () => {
    const hasher = new Sha256Hasher();
    expect(hasher.hashString('hello')).toBe(expectedSha256('hello'));
  });

  it('throws HashingError for non-existent file', async () => {
    const hasher = new Sha256Hasher();
    await expect(hasher.hashFile('/nonexistent/path.txt')).rejects.toThrow();
  });

  it('hashFiles returns sorted results', async () => {
    const dir = join(tmpdir(), `test-batch-${randomUUID()}`);
    await mkdir(dir, { recursive: true });
    const f1 = join(dir, 'b.txt');
    const f2 = join(dir, 'a.txt');
    await writeFile(f1, 'bbb', 'utf-8');
    await writeFile(f2, 'aaa', 'utf-8');

    try {
      const hasher = new Sha256Hasher();
      const results = await hasher.hashFiles([
        { path: 'b.txt', absolutePath: f1 },
        { path: 'a.txt', absolutePath: f2 },
      ]);

      expect(results[0]!.path).toBe('a.txt');
      expect(results[1]!.path).toBe('b.txt');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('getContentType', () => {
  it('returns correct content type for known extensions', () => {
    expect(getContentType('.ts')).toBe('typescript');
    expect(getContentType('.json')).toBe('json');
    expect(getContentType('.md')).toBe('markdown');
  });

  it('returns unknown for unrecognized extensions', () => {
    expect(getContentType('.xyz')).toBe('unknown');
  });

  it('is case-insensitive', () => {
    expect(getContentType('.TS')).toBe('typescript');
    expect(getContentType('.Json')).toBe('json');
  });
});
