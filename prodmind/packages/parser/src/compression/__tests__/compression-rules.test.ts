import { describe, it, expect } from 'vitest';
import { DEFAULT_COMPRESSION_RULES } from '../compression-rules.ts';

describe('DEFAULT_COMPRESSION_RULES', () => {
  it('has all required fields', () => {
    expect(DEFAULT_COMPRESSION_RULES.stripSourceLocation).toBe(true);
    expect(DEFAULT_COMPRESSION_RULES.stripParseTiming).toBe(true);
    expect(DEFAULT_COMPRESSION_RULES.stripEmptySymbols).toBe(true);
    expect(DEFAULT_COMPRESSION_RULES.stripDuplicateImports).toBe(true);
    expect(DEFAULT_COMPRESSION_RULES.maxSymbolsPerFile).toBe(50);
    expect(DEFAULT_COMPRESSION_RULES.maxDependenciesPerFile).toBe(200);
    expect(DEFAULT_COMPRESSION_RULES.prioritySymbolTypes).toContain('CLASS');
    expect(DEFAULT_COMPRESSION_RULES.highValueCentralityThreshold).toBe(0.5);
    expect(DEFAULT_COMPRESSION_RULES.preserveExportedAPIs).toBe(true);
    expect(DEFAULT_COMPRESSION_RULES.preserveAsyncMarkers).toBe(true);
  });

  it('is immutable when overridden', () => {
    const overridden = { ...DEFAULT_COMPRESSION_RULES, maxSymbolsPerFile: 10 };
    expect(overridden.maxSymbolsPerFile).toBe(10);
    expect(DEFAULT_COMPRESSION_RULES.maxSymbolsPerFile).toBe(50);
  });

  it('has stable ordering of priority types', () => {
    expect(DEFAULT_COMPRESSION_RULES.prioritySymbolTypes).toEqual(['CLASS', 'INTERFACE', 'FUNCTION']);
  });
});
