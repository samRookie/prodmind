import { describe, it, expect, afterAll } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { cleanupWorkspace, cleanupOrphanedWorkspaces } from '../utils/temp-cleanup.ts';
import { rm } from 'node:fs/promises';

const createdDirs: string[] = [];

afterAll(async () => {
  for (const dir of createdDirs) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

describe('cleanupWorkspace', () => {
  it('removes an existing directory with contents', async () => {
    const dir = join(tmpdir(), `test-cleanup-${randomUUID()}`);
    createdDirs.push(dir);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'file.txt'), 'test');
    expect(existsSync(dir)).toBe(true);

    await cleanupWorkspace(dir);

    expect(existsSync(dir)).toBe(false);
  });

  it('is idempotent on non-existent path', async () => {
    const dir = join(tmpdir(), `test-nonexistent-${randomUUID()}`);
    createdDirs.push(dir);

    await expect(cleanupWorkspace(dir)).resolves.toBeUndefined();
  });
});

describe('cleanupOrphanedWorkspaces', () => {
  it('cleans old prodmind-* dirs and skips non-matching dirs', async () => {
    const oldDir = join(tmpdir(), `prodmind-old-${randomUUID()}`);
    createdDirs.push(oldDir);
    await mkdir(oldDir, { recursive: true });

    const nonProdmindDir = join(tmpdir(), `other-prefix-${randomUUID()}`);
    createdDirs.push(nonProdmindDir);
    await mkdir(nonProdmindDir, { recursive: true });

    const cleaned = await cleanupOrphanedWorkspaces(0);

    expect(cleaned).toContain(oldDir);
    expect(cleaned.filter((p) => p === nonProdmindDir)).toHaveLength(0);
    expect(existsSync(oldDir)).toBe(false);
  });

  it('skips recent prodmind-* dirs when maxAgeMs prevents cleanup', async () => {
    const recentDir = join(tmpdir(), `prodmind-recent-${randomUUID()}`);
    createdDirs.push(recentDir);
    await mkdir(recentDir, { recursive: true });

    const cleaned = await cleanupOrphanedWorkspaces(86_400_000);

    expect(cleaned).not.toContain(recentDir);
  });
});
