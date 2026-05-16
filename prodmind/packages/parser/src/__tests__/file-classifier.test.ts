import { describe, it, expect } from 'vitest';
import { FileClassifier } from '../sanitizers/file-classifier.ts';
import { FileCategory } from '../types/classification.types.ts';

describe('FileClassifier', () => {
  const classifier = new FileClassifier();

  it('classifies .ts file as SOURCE_CODE with TypeScript language', () => {
    const result = classifier.classify('src/index.ts', 1024);
    expect(result.classification).toBe(FileCategory.SOURCE_CODE);
    expect(result.language).toBe('TypeScript');
    expect(result.extension).toBe('.ts');
  });

  it('classifies .test.ts file as TEST', () => {
    const result = classifier.classify('src/foo.test.ts', 512);
    expect(result.classification).toBe(FileCategory.TEST);
    expect(result.language).toBe('TypeScript');
  });

  it('classifies __tests__ path as TEST', () => {
    const result = classifier.classify('src/__tests__/foo.ts', 256);
    expect(result.classification).toBe(FileCategory.TEST);
  });

  it('classifies .md file as DOCUMENTATION', () => {
    const result = classifier.classify('README.md', 1024);
    expect(result.classification).toBe(FileCategory.DOCUMENTATION);
    expect(result.language).toBe('Markdown');
  });

  it('classifies Dockerfile as INFRASTRUCTURE', () => {
    const result = classifier.classify('Dockerfile', 128);
    expect(result.classification).toBe(FileCategory.INFRASTRUCTURE);
    expect(result.language).toBe('Dockerfile');
  });

  it('classifies package.json as CONFIG', () => {
    const result = classifier.classify('package.json', 2048);
    expect(result.classification).toBe(FileCategory.CONFIG);
    expect(result.language).toBe('JSON');
  });

  it('classifies .exe as BINARY', () => {
    const result = classifier.classify('bin/tool.exe', 50000);
    expect(result.classification).toBe(FileCategory.BINARY);
  });

  it('classifies .png as ASSET', () => {
    const result = classifier.classify('assets/icon.png', 4096);
    expect(result.classification).toBe(FileCategory.ASSET);
  });

  it('classifies .d.ts as GENERATED', () => {
    const result = classifier.classify('types/index.d.ts', 1024);
    expect(result.classification).toBe(FileCategory.GENERATED);
    expect(result.language).toBe('TypeScript');
  });

  it('classifies credentials file as SECRET', () => {
    const result = classifier.classify('config/credentials.json', 256);
    expect(result.classification).toBe(FileCategory.SECRET);
  });

  it('classifies unknown extension as UNKNOWN', () => {
    const result = classifier.classify('data/random.xyz', 100);
    expect(result.classification).toBe(FileCategory.UNKNOWN);
  });

  it('produces deterministic results for same input', () => {
    const r1 = classifier.classify('src/app.ts', 100);
    const r2 = classifier.classify('src/app.ts', 100);
    expect(r1).toEqual(r2);
  });

  it('classifyBatch returns sorted results', () => {
    const results = classifier.classifyBatch([
      { path: 'z/final.ts', sizeBytes: 100 },
      { path: 'a/first.ts', sizeBytes: 200 },
    ]);
    expect(results[0]?.path).toBe('a/first.ts');
    expect(results[1]?.path).toBe('z/final.ts');
  });

  it('classifies .spec.tsx file as TEST', () => {
    const result = classifier.classify('src/Component.spec.tsx', 500);
    expect(result.classification).toBe(FileCategory.TEST);
    expect(result.language).toBe('TSX');
  });
});
