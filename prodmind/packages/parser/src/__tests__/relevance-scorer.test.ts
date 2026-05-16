import { describe, it, expect } from 'vitest';
import { RelevanceScorer } from '../sanitizers/relevance-scorer.ts';
import { FileCategory, Language } from '../types/classification.types.ts';
import type { ClassifiedFile } from '../types/classification.types.ts';

function makeFile(
  path: string,
  classification: FileCategory,
  language: Language = Language.TypeScript,
  extension = '.ts',
  sizeBytes = 100,
): ClassifiedFile {
  return { path, extension, language, classification, sizeBytes, reasons: [] };
}

describe('RelevanceScorer', () => {
  it('scores source code in src/ at 0.9', () => {
    const scorer = new RelevanceScorer();
    const file = makeFile('src/app.ts', FileCategory.SOURCE_CODE);
    expect(scorer.score(file)).toBe(0.9);
  });

  it('scores source code outside src/ at 0.7', () => {
    const scorer = new RelevanceScorer();
    const file = makeFile('lib/app.ts', FileCategory.SOURCE_CODE);
    expect(scorer.score(file)).toBe(0.7);
  });

  it('scores lockfile config at 0.08', () => {
    const scorer = new RelevanceScorer();
    const file = makeFile('pnpm-lock.yaml', FileCategory.GENERATED, 'YAML', '.yaml');
    expect(scorer.score(file)).toBe(0.08);
  });

  it('scores binary at 0.0', () => {
    const scorer = new RelevanceScorer();
    const file = makeFile('bin/tool.exe', FileCategory.BINARY, 'Unknown', '.exe');
    expect(scorer.score(file)).toBe(0.0);
  });

  it('scores test file in src/ at 0.5', () => {
    const scorer = new RelevanceScorer();
    const file = makeFile('src/foo.test.ts', FileCategory.TEST);
    expect(scorer.score(file)).toBe(0.6);
  });

  it('scores documentation at 0.3', () => {
    const scorer = new RelevanceScorer();
    const file = makeFile('README.md', FileCategory.DOCUMENTATION, 'Markdown', '.md');
    expect(scorer.score(file)).toBe(0.3);
  });

  it('parse threshold defaults to 0.3', () => {
    const scorer = new RelevanceScorer();
    expect(scorer.parseThreshold).toBe(0.3);
  });

  it('toParseCandidate sets shouldParse based on threshold', () => {
    const scorer = new RelevanceScorer();
    const highFile = makeFile('src/app.ts', FileCategory.SOURCE_CODE);
    const lowFile = makeFile('pnpm-lock.yaml', FileCategory.GENERATED, 'YAML', '.yaml', 50000);

    const highCandidate = scorer.toParseCandidate(highFile);
    const lowCandidate = scorer.toParseCandidate(lowFile);

    expect(highCandidate.shouldParse).toBe(true);
    expect(lowCandidate.shouldParse).toBe(false);
  });

  it('rankCandidates sorts by descending score then ascending path', () => {
    const scorer = new RelevanceScorer();
    const files = [
      makeFile('b/app.ts', FileCategory.SOURCE_CODE, 'TypeScript', '.ts', 100),
      makeFile('a/dep.ts', FileCategory.SOURCE_CODE, 'TypeScript', '.ts', 100),
      makeFile('README.md', FileCategory.DOCUMENTATION, 'Markdown', '.md', 50),
    ];

    const candidates = scorer.rankCandidates(files);
    expect(candidates[0]!.relevanceScore).toBeGreaterThanOrEqual(candidates[1]!.relevanceScore);
    expect(candidates[2]!.relevanceScore).toBeLessThanOrEqual(candidates[1]!.relevanceScore);
  });

  it('deeply nested source code gets slight bonus', () => {
    const scorer = new RelevanceScorer();
    const file = makeFile('src/a/b/c/detail.ts', FileCategory.SOURCE_CODE);
    expect(scorer.score(file)).toBe(0.95);
  });
});
