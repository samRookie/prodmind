import { mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, normalize, dirname } from 'node:path';

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function safeWriteFile(
  workspacePath: string,
  entryPath: string,
  data: Uint8Array,
): Promise<string> {
  const resolvedPath = resolve(workspacePath, entryPath);
  const normalizedPath = normalize(resolvedPath);
  const normalizedWorkspace = normalize(workspacePath);

  if (!normalizedPath.startsWith(normalizedWorkspace)) {
    throw new Error(
      `Path escape detected: "${entryPath}" resolves outside workspace "${workspacePath}"`,
    );
  }

  const parentDir = dirname(normalizedPath);
  if (parentDir !== normalizedWorkspace) {
    await ensureDirectoryExists(parentDir);
  }

  await writeFile(normalizedPath, data);
  return normalizedPath;
}

export async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size;
}

export function resolveWorkspaceEntry(
  workspacePath: string,
  entryPath: string,
): string {
  return resolve(workspacePath, entryPath);
}
