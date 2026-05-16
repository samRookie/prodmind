import { describe, it, expect } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { FileDiscovery } from '../hashers/file-discovery.ts';
import { Sha256Hasher } from '../hashers/sha256-hasher.ts';
import { ManifestBuilder } from '../hashers/manifest-builder.ts';
import { SnapshotDiff } from '../hashers/snapshot-diff.ts';

async function createTestRepo(files: Record<string, string>): Promise<string> {
  const dir = join(tmpdir(), `test-e2e-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = join(dir, filePath);
    await mkdir(fullPath.substring(0, fullPath.lastIndexOf('\\')), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
  }
  return dir;
}

describe('Hashing Integration (e2e)', () => {
  it('end-to-end: discover → hash → manifest', async () => {
    const dir = await createTestRepo({
      'src/a.ts': 'export const a = 1;',
      'src/b.ts': 'export const b = 2;',
    });

    try {
      const discovery = new FileDiscovery();
      const discovered = await discovery.discover(dir);

      expect(discovered.length).toBe(2);

      const hasher = new Sha256Hasher();
      const hashes = await hasher.hashFiles(
        discovered.map((f) => ({ path: f.path, absolutePath: f.absolutePath })),
      );

      expect(hashes.length).toBe(2);

      const builder = new ManifestBuilder();
      const manifest = builder.build(discovered, hashes);

      expect(manifest.totalFiles).toBe(2);
      expect(manifest.repositoryHash).toBeTruthy();
      expect(manifest.repositoryHash.length).toBe(64);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('produces deterministic manifests for same directory', async () => {
    const structure = {
      'src/app.ts': 'const x = 1;',
      'README.md': '# Docs',
    };
    const dir1 = await createTestRepo(structure);
    const dir2 = await createTestRepo(structure);

    try {
      const discovery = new FileDiscovery();
      const hasher = new Sha256Hasher();
      const builder = new ManifestBuilder();

      const d1 = await discovery.discover(dir1);
      const h1 = await hasher.hashFiles(d1.map((f) => ({ path: f.path, absolutePath: f.absolutePath })));
      const m1 = builder.build(d1, h1);

      const d2 = await discovery.discover(dir2);
      const h2 = await hasher.hashFiles(d2.map((f) => ({ path: f.path, absolutePath: f.absolutePath })));
      const m2 = builder.build(d2, h2);

      expect(m1.repositoryHash).toBe(m2.repositoryHash);
      expect(m1.files).toEqual(m2.files);
    } finally {
      await rm(dir1, { recursive: true, force: true });
      await rm(dir2, { recursive: true, force: true });
    }
  });

  it('snapshot diff detects file changes', async () => {
    const dir = await createTestRepo({
      'stable.ts': 'const x = 1;',
      'will-change.ts': 'const a = "old";',
    });

    try {
      const discovery = new FileDiscovery();
      const hasher = new Sha256Hasher();
      const builder = new ManifestBuilder();
      const diffEngine = new SnapshotDiff();

      const d1 = await discovery.discover(dir);
      const h1 = await hasher.hashFiles(d1.map((f) => ({ path: f.path, absolutePath: f.absolutePath })));
      const manifest1 = builder.build(d1, h1);

      await writeFile(join(dir, 'will-change.ts'), 'const a = "new";', 'utf-8');
      await writeFile(join(dir, 'added.ts'), 'const c = 3;', 'utf-8');

      const d2 = await discovery.discover(dir);
      const h2 = await hasher.hashFiles(d2.map((f) => ({ path: f.path, absolutePath: f.absolutePath })));
      const manifest2 = builder.build(d2, h2);

      const diff = diffEngine.diff(manifest1, manifest2);

      expect(diff.added).toEqual(['added.ts']);
      expect(diff.modified).toEqual(['will-change.ts']);
      expect(diff.unchanged).toEqual(['stable.ts']);
      expect(diff.removed).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('ignores node_modules in discovery', async () => {
    const dir = await createTestRepo({
      'src/index.ts': 'code',
      'node_modules/pkg/index.js': 'module.exports = {};',
    });

    try {
      const discovery = new FileDiscovery();
      const discovered = await discovery.discover(dir);

      const paths = discovered.map((f) => f.path);
      expect(paths).toEqual(['src/index.ts']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
