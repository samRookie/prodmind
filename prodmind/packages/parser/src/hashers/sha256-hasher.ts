import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { HashResult } from '../types/hashing.types.ts';
import { HashingError } from './hashing-errors.ts';
import { basename } from 'node:path';

const CONTENT_TYPE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.md': 'markdown',
  '.mdx': 'markdown',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c-header',
  '.hpp': 'cpp-header',
  '.cs': 'csharp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.proto': 'protobuf',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.tf': 'terraform',
  '.svg': 'svg',
  '.txt': 'text',
};

export function getContentType(extension: string): string {
  return CONTENT_TYPE_MAP[extension.toLowerCase()] ?? 'unknown';
}

export class Sha256Hasher {
  public async hashFile(filePath: string, relativePath?: string): Promise<HashResult> {
    let stats;
    try {
      stats = await stat(filePath);
    } catch (err) {
      throw new HashingError(
        `Failed to stat file for hashing: "${filePath}"`,
        { cause: err instanceof Error ? err : undefined },
      );
    }

    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    try {
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk) => hash.update(chunk as Buffer));
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
      });
    } catch (err) {
      throw new HashingError(
        `Failed to hash file: "${filePath}"`,
        { cause: err instanceof Error ? err : undefined },
      );
    }

    const path = relativePath ?? filePath.replace(/\\/g, '/');
    const ext = '.' + basename(path).split('.').pop()?.toLowerCase();

    return {
      path,
      sha256: hash.digest('hex'),
      sizeBytes: stats.size,
      contentType: getContentType(ext),
      generatedAt: new Date().toISOString(),
    };
  }

  public async hashFiles(
    files: Array<{ path: string; absolutePath: string }>,
  ): Promise<HashResult[]> {
    const results: HashResult[] = [];

    for (const file of files) {
      const result = await this.hashFile(file.absolutePath, file.path);
      results.push(result);
    }

    return results.sort((a, b) => a.path.localeCompare(b.path));
  }

  public hashBuffer(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  public hashString(data: string): string {
    return createHash('sha256').update(data, 'utf-8').digest('hex');
  }
}
