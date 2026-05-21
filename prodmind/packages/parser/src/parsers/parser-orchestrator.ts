import { getLimits } from '@prodmind/core';
import type { ParseResult } from '../types/ast.types.ts';
import { parseTypeScriptFile } from './ts-parser.ts';
import { shouldParseFile } from './unsupported-files.ts';

export interface BatchParseOptions {
  concurrency?: number;
  timeoutPerFile?: number;
}

export async function batchParseFiles(
  files: Array<{ path: string; source: string }>,
  options?: BatchParseOptions,
): Promise<ParseResult[]> {
  const limits = getLimits();
  const timeoutPerFile = options?.timeoutPerFile ?? limits.parse.maxParseTimeMs;

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  const results: ParseResult[] = [];

  for (const file of sorted) {
    if (!shouldParseFile(file.path)) {
      results.push({
        success: false,
        path: file.path,
        error: `Unsupported file type: "${file.path}"`,
        errorType: 'UNSUPPORTED',
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          durationMs: 0,
          parserVersion: 'ts-compiler-api-5.x',
        },
      });
      continue;
    }

    const result = await parseWithTimeout(file.path, file.source, timeoutPerFile);
    results.push(result);
  }

  return results;
}

async function parseWithTimeout(
  path: string,
  source: string,
  timeoutMs: number,
): Promise<ParseResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        success: false,
        path,
        error: `Parse timed out after ${timeoutMs}ms`,
        errorType: 'TIMEOUT',
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          durationMs: timeoutMs,
          parserVersion: 'ts-compiler-api-5.x',
        },
      });
    }, timeoutMs);

    try {
      const result = parseTypeScriptFile(path, source);
      clearTimeout(timer);
      resolve(result);
    } catch (err) {
      clearTimeout(timer);
      resolve({
        success: false,
        path,
        error: err instanceof Error ? err.message : String(err),
        errorType: 'WORKER_CRASH',
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          durationMs: 0,
          parserVersion: 'ts-compiler-api-5.x',
        },
      });
    }
  });
}
