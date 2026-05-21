import { AppError } from '@prodmind/core';

export class ResolutionError extends AppError {
  public constructor(message: string, options?: { cause?: Error; details?: Record<string, unknown> }) {
    super('PARSER_ERROR', message, { statusCode: 422, details: options?.details, cause: options?.cause });
    this.name = 'ResolutionError';
  }
}

export class PathResolutionError extends ResolutionError {
  public readonly importPath: string;
  public readonly sourceFile: string;

  public constructor(importPath: string, sourceFile: string, message: string) {
    super(message, { details: { importPath, sourceFile } });
    this.name = 'PathResolutionError';
    this.importPath = importPath;
    this.sourceFile = sourceFile;
  }
}

export class ExportResolutionError extends ResolutionError {
  public readonly symbolName: string;
  public readonly sourceFile: string;

  public constructor(symbolName: string, sourceFile: string, message: string) {
    super(message, { details: { symbolName, sourceFile } });
    this.name = 'ExportResolutionError';
    this.symbolName = symbolName;
    this.sourceFile = sourceFile;
  }
}

export class CyclicReExportError extends ResolutionError {
  public readonly chain: string[];

  public constructor(chain: string[]) {
    super(`Cyclic re-export chain detected: ${chain.join(' → ')}`, { details: { chain } });
    this.name = 'CyclicReExportError';
    this.chain = chain;
  }
}
