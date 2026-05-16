import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { ensureDirectoryExists, resolveWorkspaceEntry } from '../utils/file-system.ts';
import { cleanupWorkspace } from '../utils/temp-cleanup.ts';

export class ExtractionWorkspace {
  public readonly extractionId: string;
  public readonly path: string;
  private _cleaned = false;

  private constructor(extractionId: string, path: string) {
    this.extractionId = extractionId;
    this.path = path;
  }

  public static async create(): Promise<ExtractionWorkspace> {
    const ts = Date.now().toString(36);
    const uuid = randomUUID();
    const extractionId = `${ts}-${uuid}`;
    const dirName = `prodmind-${extractionId}`;
    const workspacePath = join(tmpdir(), dirName);

    await mkdir(workspacePath, { recursive: true });

    return new ExtractionWorkspace(extractionId, workspacePath);
  }

  public resolveEntryPath(entryPath: string): string {
    return resolveWorkspaceEntry(this.path, entryPath);
  }

  public async cleanup(): Promise<void> {
    if (this._cleaned) return;
    this._cleaned = true;
    await cleanupWorkspace(this.path);
  }

  public get cleaned(): boolean {
    return this._cleaned;
  }

  public async ensureParentDir(entryPath: string): Promise<void> {
    const fullPath = this.resolveEntryPath(entryPath);
    const parentDir = dirname(fullPath);

    if (parentDir !== this.path) {
      await ensureDirectoryExists(parentDir);
    }
  }
}
