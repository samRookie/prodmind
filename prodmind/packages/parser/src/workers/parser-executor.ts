import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { ParseResult } from '../types/ast.types.ts';
import type { ParserWorkerOutput } from './parser-worker.ts';

let workerPath: string | null = null;

function getWorkerPath(): string {
  if (workerPath) return workerPath;

  const currentDir = dirname(fileURLToPath(import.meta.url));
  workerPath = resolve(currentDir, 'parser-worker.ts');
  return workerPath;
}

export function executeInWorker(
  filePath: string,
  source?: string,
  taskId?: string,
  timeoutMs = 30_000,
): Promise<ParserWorkerOutput> {
  return new Promise((resolve, _reject) => {
    const id = taskId ?? `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const worker = new Worker(getWorkerPath(), {
      workerData: {
        taskId: id,
        filePath,
        source,
      },
      eval: false,
    });

    const timer = setTimeout(() => {
      worker.terminate().catch(() => {});
      const failure: ParseResult = {
        success: false,
        path: filePath,
        error: `Worker timed out after ${timeoutMs}ms`,
        errorType: 'TIMEOUT',
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          durationMs: timeoutMs,
          parserVersion: 'ts-compiler-api-5.x',
        },
      };
      resolve({
        taskId: id,
        filePath,
        result: failure,
        durationMs: timeoutMs,
      });
    }, timeoutMs);

    worker.on('message', (output: ParserWorkerOutput) => {
      clearTimeout(timer);
      worker.terminate().catch(() => {});
      resolve(output);
    });

    worker.on('error', (err) => {
      clearTimeout(timer);
      worker.terminate().catch(() => {});

      const failure: ParseResult = {
        success: false,
        path: filePath,
        error: `Worker error: ${err.message}`,
        errorType: 'WORKER_CRASH',
        timing: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          durationMs: 0,
          parserVersion: 'ts-compiler-api-5.x',
        },
      };
      resolve({
        taskId: id,
        filePath,
        result: failure,
        durationMs: 0,
      });
    });

    worker.on('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const failure: ParseResult = {
          success: false,
          path: filePath,
          error: `Worker exited with code ${code}`,
          errorType: 'WORKER_CRASH',
          timing: {
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            durationMs: 0,
            parserVersion: 'ts-compiler-api-5.x',
          },
        };
        resolve({
          taskId: id,
          filePath,
          result: failure,
          durationMs: 0,
        });
      }
    });
  });
}
