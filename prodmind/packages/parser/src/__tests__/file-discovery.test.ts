import { describe, it, expect, afterAll } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { FileDiscovery } from '../hashers/file-discovery.ts';

const tempDirs: string[] = [];

afterAll(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

async function createTestDir(structure: Record<string, string>): Promise<string> {
  const base = join(tmpdir(), `test-discovery-${randomUUID()}`);
  tempDirs.push(base);
  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = join(base, filePath);
    await mkdir(fullPath.substring(0, fullPath.lastIndexOf('\\')), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
  }
  return base;
}

describe('FileDiscovery', () => {
  it('discovers files in a basic directory tree', async () => {
    const dir = await createTestDir({
      'src/index.ts': 'export const a = 1;',
      'src/utils/helper.ts': 'export const b = 2;',
      'README.md': '# Project',
    });

    const discovery = new FileDiscovery();
    const files = await discovery.discover(dir);

    expect(files.length).toBe(3);
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual(['README.md', 'src/index.ts', 'src/utils/helper.ts']);
  });

  it('skips node_modules directory', async () => {
    const dir = await createTestDir({
      'src/index.ts': 'code',
      'node_modules/lodash/index.js': 'module.exports = {};',
    });

    const discovery = new FileDiscovery();
    const files = await discovery.discover(dir);

    const paths = files.map((f) => f.path);
    expect(paths).toContain('src/index.ts');
    expect(paths).not.toContain('node_modules/lodash/index.js');
  });

  it('skips .git directory', async () => {
    const dir = await createTestDir({
      'src/index.ts': 'code',
      '.git/config': '[core]',
    });

    const discovery = new FileDiscovery();
    const files = await discovery.discover(dir);

    const paths = files.map((f) => f.path);
    expect(paths).not.toContain('.git/config');
  });

  it('normalizes paths with forward slashes', async () => {
    const dir = await createTestDir({
      'src/app.ts': 'code',
    });

    const discovery = new FileDiscovery();
    const files = await discovery.discover(dir);

    expect(files[0]!.path).toBe('src/app.ts');
    expect(files[0]!.path).not.toContain('\\');
  });

  it('returns deterministic ordering', async () => {
    const dir = await createTestDir({
      'b.ts': 'b',
      'a.ts': 'a',
      'c.ts': 'c',
    });

    const discovery = new FileDiscovery();
    const r1 = await discovery.discover(dir);
    const r2 = await discovery.discover(dir);

    expect(r1.map((f) => f.path)).toEqual(r2.map((f) => f.path));
    expect(r1[0]!.path).toBe('a.ts');
    expect(r1[1]!.path).toBe('b.ts');
    expect(r1[2]!.path).toBe('c.ts');
  });

  it('respects maxDepth option', async () => {
    const dir = await createTestDir({
      'root.ts': 'root',
      'src/a.ts': 'a',
      'src/sub/b.ts': 'b',
    });

    const discovery = new FileDiscovery({ maxDepth: 1 });
    const files = await discovery.discover(dir);

    const paths = files.map((f) => f.path);
    expect(paths).toContain('root.ts');
    expect(paths).toContain('src/a.ts');
    expect(paths).not.toContain('src/sub/b.ts');
  });

  it('skips symlinks by default', async () => {
    const dir = await createTestDir({
      'real.txt': 'real content',
    });

    const discovery = new FileDiscovery();
    const files = await discovery.discover(dir);

    expect(files.length).toBe(1);
    expect(files[0]!.path).toBe('real.txt');
  });

  it('skips dotfiles by default', async () => {
    const dir = await createTestDir({
      'file.ts': 'code',
      '.env': 'SECRET=1',
      '.hidden/config.ts': 'hidden',
    });

    const discovery = new FileDiscovery();
    const files = await discovery.discover(dir);

    const paths = files.map((f) => f.path);
    expect(paths).toEqual(['file.ts']);
  });

  it('classifies discovered files', async () => {
    const dir = await createTestDir({
      'src/app.ts': 'export const x = 1;',
      'README.md': '# Docs',
    });

    const discovery = new FileDiscovery();
    const files = await discovery.discover(dir);

    const srcFile = files.find((f) => f.path === 'src/app.ts')!;
    expect(srcFile.classification).toBe('SOURCE_CODE');
    expect(srcFile.shouldParse).toBe(true);
    expect(srcFile.extension).toBe('.ts');

    const docFile = files.find((f) => f.path === 'README.md')!;
    expect(docFile.classification).toBe('DOCUMENTATION');
  });
});
