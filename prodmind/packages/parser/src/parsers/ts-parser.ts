import ts from 'typescript';
import type { ParsedFile, ParseResult, ParseFailure } from '../types/ast.types.ts';
import { extractImports, extractExports, extractSymbols } from './symbol-extractor.ts';
import { getLanguage } from './unsupported-files.ts';

const PARSER_VERSION = 'ts-compiler-api-5.x';

export function parseTypeScriptFile(
  filePath: string,
  source: string,
): ParseResult {
  const startWall = Date.now();
  const startTime = performance.now();

  const makeTiming = () => {
    const endWall = Date.now();
    return {
      startTime: new Date(startWall).toISOString(),
      endTime: new Date(endWall).toISOString(),
      durationMs: Math.round((performance.now() - startTime) * 100) / 100,
      parserVersion: PARSER_VERSION,
    };
  };

  try {
    const scriptTarget = ts.ScriptTarget.Latest;

    let scriptKind = ts.ScriptKind.TS;
    if (filePath.endsWith('.tsx')) {
      scriptKind = ts.ScriptKind.TSX;
    } else if (filePath.endsWith('.jsx')) {
      scriptKind = ts.ScriptKind.JSX;
    } else if (filePath.endsWith('.js')) {
      scriptKind = ts.ScriptKind.JS;
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      source,
      scriptTarget,
      true,
      scriptKind,
    );

    const diagnostics = (sourceFile as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics;
    if (diagnostics && diagnostics.length > 0) {
      const firstDiag = diagnostics[0]!;
      const message = ts.flattenDiagnosticMessageText(firstDiag.messageText, '\n');
      const failure: ParseFailure = {
        success: false,
        path: filePath,
        error: message,
        errorType: 'MALFORMED_SYNTAX',
        timing: makeTiming(),
      };
      return failure;
    }

    const imports = extractImports(sourceFile);
    const exports = extractExports(sourceFile);
    const symbols = extractSymbols(sourceFile);

    const parsed: ParsedFile = {
      path: filePath,
      language: getLanguage(filePath),
      symbols,
      imports,
      exports,
      timing: makeTiming(),
    };

    return { success: true, data: parsed };
  } catch (err) {
    const failure: ParseFailure = {
      success: false,
      path: filePath,
      error: err instanceof Error ? err.message : String(err),
      errorType: 'MALFORMED_SYNTAX',
      timing: makeTiming(),
    };

    return failure;
  }
}
