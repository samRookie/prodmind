import { rm, readdir, stat } from 'node:fs/promises';
import { Dirent } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export const TEMP_PREFIX = 'prodmind-';

export async function cleanupWorkspace(workspacePath: string): Promise<void> {
  try {
    await rm(workspacePath, { recursive: true, force: true });
  } catch {
    // Already cleaned or never existed — idempotent
  }
}

export async function cleanupOrphanedWorkspaces(
  maxAgeMs: number = 86_400_000,
): Promise<string[]> {
  const tempDir = tmpdir();
  let entries: Dirent[];

  try {
    entries = await readdir(tempDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const now = Date.now();
  const cleaned: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith(TEMP_PREFIX)) {
      continue;
    }

    const fullPath = join(tempDir, entry.name);

    try {
      const stats = await stat(fullPath);
      const age = now - stats.birthtimeMs;
      if (age > maxAgeMs) {
        await rm(fullPath, { recursive: true, force: true });
        cleaned.push(fullPath);
      }
    } catch {
      // Skip entries we can't stat
    }
  }

  return cleaned;
}
