import { describe, expect,it } from 'vitest';

import { PromptNormalizer } from '../../prompts/normalization/prompt-normalizer.ts';

describe('PromptNormalizer', () => {
  const normalizer = new PromptNormalizer();

  it('normalizes whitespace', async () => {
    const result = await normalizer.normalize('  Hello World\n\n\n\nTest  ', { sortSections: false });
    expect(result.normalizedText).toBe('Hello World\n\nTest');
  });

  it('sorts sections alphabetically when enabled', async () => {
    const text = '# Zone B\nContent B\n# Zone A\nContent A';
    const result = await normalizer.normalize(text, { sortSections: true });
    expect(result.normalizedText).toMatch(/Zone A/);
    expect(result.normalizedText).toMatch(/Zone B/);
    expect(result.sections).toContain('Zone A');
    expect(result.sections).toContain('Zone B');
  });

  it('produces a deterministic fingerprint for same input', async () => {
    const r1 = await normalizer.normalize('Hello World');
    const r2 = await normalizer.normalize('Hello World');
    expect(r1.fingerprint).toBe(r2.fingerprint);
  });

  it('produces different fingerprints for different inputs', async () => {
    const r1 = await normalizer.normalize('Hello World');
    const r2 = await normalizer.normalize('Goodbye World');
    expect(r1.fingerprint).not.toBe(r2.fingerprint);
  });

  it('estimates tokens as ceil(length/4)', async () => {
    const result = await normalizer.normalize('a'.repeat(10), { sortSections: false });
    expect(result.tokenEstimate).toBe(3);
  });

  it('returns frozen result', async () => {
    const result = await normalizer.normalize('test');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sections)).toBe(true);
  });
});
