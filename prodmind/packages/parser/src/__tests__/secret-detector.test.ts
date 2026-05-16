import { describe, it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { SecretDetector } from '../sanitizers/secret-detector.ts';

async function createTempDir(): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const dirPath = join(tmpdir(), `test-secrets-${randomUUID()}`);
  await mkdir(dirPath, { recursive: true });
  return {
    path: dirPath,
    cleanup: async () => {
      await rm(dirPath, { recursive: true, force: true });
    },
  };
}

async function writeTestFile(dir: string, name: string, content: string): Promise<string> {
  const fullPath = join(dir, name);
  await writeFile(fullPath, content, 'utf-8');
  return name;
}

describe('SecretDetector', () => {
  it('detects AWS access key', async () => {
    const { path: dir, cleanup } = await createTempDir();
    try {
      const fileName = await writeTestFile(dir, 'config.ts', [
        'const awsKey = "AKIAIOSFODNN7EXAMPLE";',
      ].join('\n'));
      const detector = new SecretDetector();
      const matches = await detector.scanFile(dir, fileName);

      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0]!.secretType).toBe('AWS_ACCESS_KEY');
      expect(matches[0]!.file).toBe(fileName);
    } finally {
      await cleanup();
    }
  });

  it('detects JWT tokens', async () => {
    const { path: dir, cleanup } = await createTempDir();
    try {
      const fileName = await writeTestFile(dir, 'auth.ts', [
        'const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVNHqEwqW5dHiP2zFfJ7xI1MpC3gYtk";',
      ].join('\n'));
      const detector = new SecretDetector();
      const matches = await detector.scanFile(dir, fileName);

      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0]!.secretType).toBe('JWT');
    } finally {
      await cleanup();
    }
  });

  it('detects SSH private key header', async () => {
    const { path: dir, cleanup } = await createTempDir();
    try {
      const fileName = await writeTestFile(dir, 'id_rsa', [
        '-----BEGIN OPENSSH PRIVATE KEY-----',
        'fakekeydata',
        '-----END OPENSSH PRIVATE KEY-----',
      ].join('\n'));
      const detector = new SecretDetector();
      const matches = await detector.scanFile(dir, fileName);

      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0]!.secretType).toBe('SSH_PRIVATE_KEY');
    } finally {
      await cleanup();
    }
  });

  it('returns empty array for normal source code', async () => {
    const { path: dir, cleanup } = await createTempDir();
    try {
      const fileName = await writeTestFile(dir, 'normal.ts', [
        'export function add(a: number, b: number): number {',
        '  return a + b;',
        '}',
      ].join('\n'));
      const detector = new SecretDetector();
      const matches = await detector.scanFile(dir, fileName);

      expect(matches).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it('returns metadata only, never the secret value', async () => {
    const { path: dir, cleanup } = await createTempDir();
    try {
      const secretValue = 'AKIAIOSFODNN7EXAMPLE';
      const fileName = await writeTestFile(dir, 'config.ts', `key = "${secretValue}"`);
      const detector = new SecretDetector();
      const matches = await detector.scanFile(dir, fileName);

      expect(matches.length).toBeGreaterThanOrEqual(1);
      const match = matches[0]!;
      expect(match).toHaveProperty('file');
      expect(match).toHaveProperty('line');
      expect(match).toHaveProperty('secretType');
      expect(match).toHaveProperty('confidence');
      expect(JSON.stringify(match)).not.toContain(secretValue);
    } finally {
      await cleanup();
    }
  });

  it('handles missing file gracefully', async () => {
    const detector = new SecretDetector();
    await expect(
      detector.scanFile('/nonexistent', 'missing.txt'),
    ).rejects.toThrow();
  });
});
