import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTypeScriptFile } from '../parsers/ts-parser.ts';
import { shouldParseFile } from '../parsers/unsupported-files.ts';
import { batchParseFiles } from '../parsers/parser-orchestrator.ts';
import { SymbolType } from '../types/ast.types.ts';
import type { ParseResult } from '../types/ast.types.ts';

function getPath(r: ParseResult): string {
  if (r.success) return r.data.path;
  return r.path;
}

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const FIXTURES = join(__dirname, 'fixtures');

function readFixture(...segments: string[]): string {
  const filePath = join(FIXTURES, ...segments);
  if (!existsSync(filePath)) {
    throw new Error(`Fixture not found: ${filePath}`);
  }
  return readFileSync(filePath, 'utf-8');
}

describe('shouldParseFile', () => {
  it('accepts .ts files', () => {
    expect(shouldParseFile('src/index.ts')).toBe(true);
  });

  it('accepts .tsx files', () => {
    expect(shouldParseFile('src/Component.tsx')).toBe(true);
  });

  it('accepts .js files', () => {
    expect(shouldParseFile('src/index.js')).toBe(true);
  });

  it('accepts .jsx files', () => {
    expect(shouldParseFile('src/Component.jsx')).toBe(true);
  });

  it('rejects unsupported extensions', () => {
    expect(shouldParseFile('main.py')).toBe(false);
    expect(shouldParseFile('main.rs')).toBe(false);
    expect(shouldParseFile('main.go')).toBe(false);
  });

  it('rejects binary extensions', () => {
    expect(shouldParseFile('image.png')).toBe(false);
    expect(shouldParseFile('archive.zip')).toBe(false);
    expect(shouldParseFile('binary.exe')).toBe(false);
  });

  it('rejects dotfiles', () => {
    expect(shouldParseFile('.env')).toBe(false);
  });
});

describe('parseTypeScriptFile', () => {
  it('parses valid TS file with imports and exports', () => {
    const source = readFixture('valid', 'basic.ts');
    const result = parseTypeScriptFile('/test/basic.ts', source);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const parsed = result.data;
    expect(parsed.path).toBe('/test/basic.ts');
    expect(parsed.language).toBe('typescript');
    expect(parsed.imports.length).toBe(3);
    expect(parsed.symbols.length).toBe(3);
    expect(parsed.exports.length).toBe(2);
    expect(parsed.timing.parserVersion).toBeTruthy();
    expect(parsed.timing.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('extracts interface, class, enum, type alias from all-symbols', () => {
    const source = readFixture('valid', 'all-symbols.ts');
    const result = parseTypeScriptFile('/test/all-symbols.ts', source);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const parsed = result.data;
    const types = parsed.symbols.map((s) => s.symbolType);

    expect(types).toContain(SymbolType.INTERFACE);
    expect(types).toContain(SymbolType.CLASS);
    expect(types).toContain(SymbolType.ENUM);
    expect(types).toContain(SymbolType.TYPE_ALIAS);
    expect(types).toContain(SymbolType.VARIABLE);
  });

  it('detects async functions', () => {
    const source = readFixture('valid', 'async-function.ts');
    const result = parseTypeScriptFile('/test/async-function.ts', source);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const parsed = result.data;
    const asyncFuncs = parsed.symbols.filter((s) => s.isAsync);

    expect(asyncFuncs.length).toBeGreaterThanOrEqual(2);
    expect(asyncFuncs.some((s) => s.name === 'fetchData')).toBe(true);
    expect(asyncFuncs.some((s) => s.name === 'handler')).toBe(true);
  });

  it('detects default and named exports', () => {
    const source = readFixture('valid', 'exports.ts');
    const result = parseTypeScriptFile('/test/exports.ts', source);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const parsed = result.data;
    const exportNames = parsed.exports.map((e) => e.name);

    expect(exportNames).toContain('(default)');
    expect(exportNames).toContain('named');
    expect(exportNames).toContain('renamedHelper');
  });

  it('extracts class with methods', () => {
    const source = readFixture('valid', 'all-symbols.ts');
    const result = parseTypeScriptFile('/test/all-symbols.ts', source);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const parsed = result.data;
    const cls = parsed.symbols.find((s) => s.symbolType === SymbolType.CLASS);
    expect(cls).toBeTruthy();
    expect(cls!.name).toBe('UserService');
    expect(cls!.exported).toBe(true);
  });

  it('extracts enum values', () => {
    const source = readFixture('valid', 'all-symbols.ts');
    const result = parseTypeScriptFile('/test/all-symbols.ts', source);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const parsed = result.data;
    const enm = parsed.symbols.find((s) => s.symbolType === SymbolType.ENUM);
    expect(enm).toBeTruthy();
    expect(enm!.name).toBe('Status');
  });

  it('handles malformed syntax gracefully', () => {
    const source = readFixture('invalid', 'syntax-error.ts');
    const result = parseTypeScriptFile('/test/syntax-error.ts', source);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errorType).toBe('MALFORMED_SYNTAX');
    expect(result.path).toBe('/test/syntax-error.ts');
  });

  it('handles empty file', () => {
    const result = parseTypeScriptFile('/test/empty.ts', '');
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.symbols).toEqual([]);
    expect(result.data.imports).toEqual([]);
    expect(result.data.exports).toEqual([]);
  });

  it('captures circular imports', () => {
    const sourceA = readFixture('circular', 'a.ts');
    const resultA = parseTypeScriptFile('/test/a.ts', sourceA);

    expect(resultA.success).toBe(true);
    if (!resultA.success) return;

    const importSources = resultA.data.imports.map((i) => i.source);
    expect(importSources).toContain('./b');

    const sourceB = readFixture('circular', 'b.ts');
    const resultB = parseTypeScriptFile('/test/b.ts', sourceB);

    expect(resultB.success).toBe(true);
    if (!resultB.success) return;

    const importSourcesB = resultB.data.imports.map((i) => i.source);
    expect(importSourcesB).toContain('./a');
  });

  it('parses JSX files', () => {
    const source = readFixture('jsx', 'component.jsx');
    const result = parseTypeScriptFile('/test/component.jsx', source);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const parsed = result.data;
    expect(parsed.language).toBe('jsx');
    const funcs = parsed.symbols.filter((s) => s.symbolType === SymbolType.FUNCTION);
    expect(funcs.length).toBeGreaterThanOrEqual(1);
  });

  it('parses TSX files', () => {
    const source = readFixture('tsx', 'component.tsx');
    const result = parseTypeScriptFile('/test/component.tsx', source);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const parsed = result.data;
    expect(parsed.language).toBe('tsx');
    const exportedClasses = parsed.symbols.filter((s) => s.exported);
    expect(exportedClasses.length).toBeGreaterThanOrEqual(1);
  });

  it('produces deterministic output', () => {
    const source = readFixture('valid', 'basic.ts');
    const r1 = parseTypeScriptFile('/test/basic.ts', source);
    const r2 = parseTypeScriptFile('/test/basic.ts', source);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    if (!r1.success || !r2.success) return;

    expect(r1.data.symbols).toEqual(r2.data.symbols);
    expect(r1.data.imports).toEqual(r2.data.imports);
    expect(r1.data.exports).toEqual(r2.data.exports);
  });

  it('extracts imports with specifiers', () => {
    const source = readFixture('valid', 'basic.ts');
    const result = parseTypeScriptFile('/test/basic.ts', source);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const imports = result.data.imports;

    const namedImport = imports.find((i) => i.source === './utils');
    expect(namedImport).toBeTruthy();
    expect(namedImport!.specifiers).toContain('foo');
    expect(namedImport!.isDefault).toBe(false);

    const defaultImport = imports.find((i) => i.source === 'lodash');
    expect(defaultImport).toBeTruthy();
    expect(defaultImport!.specifiers).toContain('bar');
    expect(defaultImport!.isDefault).toBe(true);

    const nsImport = imports.find((i) => i.source === './exports');
    expect(nsImport).toBeTruthy();
    expect(nsImport!.isNamespace).toBe(true);
  });
});

describe('batchParseFiles', () => {
  it('parses multiple files and returns sorted results', async () => {
    const files = [
      { path: '/test/b.ts', source: readFixture('valid', 'basic.ts') },
      { path: '/test/a.ts', source: readFixture('valid', 'all-symbols.ts') },
    ];

    const results = await batchParseFiles(files, { timeoutPerFile: 10_000 });

    expect(results.length).toBe(2);
    expect(getPath(results[0]!)).toContain('a.ts');
    expect(getPath(results[1]!)).toContain('b.ts');
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('handles partial failure without halting', async () => {
    const files = [
      { path: '/test/valid.ts', source: readFixture('valid', 'basic.ts') },
      { path: '/test/invalid.ts', source: readFixture('invalid', 'syntax-error.ts') },
    ];

    const results = await batchParseFiles(files, { timeoutPerFile: 10_000 });

    expect(results.length).toBe(2);

    const valid = results.find((r) => {
      const p = getPath(r);
      return p.split('/').pop() === 'valid.ts';
    });
    const invalid = results.find((r) => {
      const p = getPath(r);
      return p.split('/').pop() === 'invalid.ts';
    });

    expect(valid?.success).toBe(true);
    expect(invalid?.success).toBe(false);
    if (invalid && !invalid.success) {
      expect(invalid.errorType).toBe('MALFORMED_SYNTAX');
    }
  });
});
