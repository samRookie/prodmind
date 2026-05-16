import { parentPort, workerData } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import { parseTypeScriptFile } from '../parsers/ts-parser.ts';
import { shouldParseFile } from '../parsers/unsupported-files.ts';
import type { ParseResult, ParseFailure, ParseTiming } from '../types/ast.types.ts';

export interface ParserWorkerInput {
  taskId: string;
  filePath: string;
  projectId: string;
  source?: string;
}

export interface ParserWorkerOutput {
  taskId: string;
  filePath: string;
  result: ParseResult;
  durationMs: number;
}

async function run(): Promise<void> {
  const input = (workerData ?? {}) as ParserWorkerInput;
  const startWall = Date.now();
  const startTime = performance.now();

  const makeTiming = (): ParseTiming => ({
    startTime: new Date(startWall).toISOString(),
    endTime: new Date(Date.now()).toISOString(),
    durationMs: Math.round((performance.now() - startTime) * 100) / 100,
    parserVersion: 'ts-compiler-api-5.x',
  });

  try {
    if (!input.filePath) {
      throw new Error('No filePath provided to worker');
    }

    if (!shouldParseFile(input.filePath)) {
      const failure: ParseFailure = {
        success: false,
        path: input.filePath,
        error: `Unsupported file type: "${input.filePath}"`,
        errorType: 'UNSUPPORTED',
        timing: makeTiming(),
      };

      const output: ParserWorkerOutput = {
        taskId: input.taskId,
        filePath: input.filePath,
        result: failure,
        durationMs: performance.now() - startTime,
      };

      parentPort?.postMessage(output);
      return;
    }

    let source = input.source;
    if (!source) {
      source = await readFile(input.filePath, 'utf-8');
    }

    const parseResult = parseTypeScriptFile(input.filePath, source);

    const output: ParserWorkerOutput = {
      taskId: input.taskId,
      filePath: input.filePath,
      result: parseResult,
      durationMs: performance.now() - startTime,
    };

    parentPort?.postMessage(output);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    const failure: ParseFailure = {
      success: false,
      path: input.filePath,
      error: errorMessage,
      errorType: 'MALFORMED_SYNTAX',
      timing: makeTiming(),
    };

    const output: ParserWorkerOutput = {
      taskId: input.taskId,
      filePath: input.filePath,
      result: failure,
      durationMs: performance.now() - startTime,
    };

    parentPort?.postMessage(output);
  }
}

run().catch((err) => {
  const failure: ParseFailure = {
    success: false,
    path: '',
    error: err instanceof Error ? err.message : String(err),
    errorType: 'WORKER_CRASH',
    timing: {
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationMs: 0,
      parserVersion: 'ts-compiler-api-5.x',
    },
  };

  parentPort?.postMessage({
    taskId: '',
    filePath: '',
    result: failure,
    durationMs: 0,
  });
});
