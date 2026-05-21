import { describe, it, expect } from 'vitest';
import { PromptFingerprinter } from '../../prompts/fingerprinting/prompt-fingerprinter.ts';
import { sha256, sha256Truncated, canonicalFingerprint } from '../../prompts/fingerprinting/canonical-hash.ts';
import { stableStringify, sortKeysDeep, normalizeArrays } from '../../prompts/serialization/stable-json.ts';

describe('PromptFingerprinter', () => {
  const fingerprinter = new PromptFingerprinter();

  it('produces stable template fingerprints', async () => {
    const fp1 = await fingerprinter.templateFingerprint('Hello {{name}}', 'ANALYSIS');
    const fp2 = await fingerprinter.templateFingerprint('Hello {{name}}', 'ANALYSIS');
    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprints for different templates', async () => {
    const fp1 = await fingerprinter.templateFingerprint('Hello {{name}}', 'ANALYSIS');
    const fp2 = await fingerprinter.templateFingerprint('Hello {{user}}', 'ANALYSIS');
    expect(fp1).not.toBe(fp2);
  });

  it('produces stable rendered fingerprints', async () => {
    const fp1 = await fingerprinter.renderedFingerprint('Hello Alice', 'You are helpful', { temp: 0.5 });
    const fp2 = await fingerprinter.renderedFingerprint('Hello Alice', 'You are helpful', { temp: 0.5 });
    expect(fp1).toBe(fp2);
  });

  it('produces stable execution fingerprints', async () => {
    const rendered = await fingerprinter.renderedFingerprint('Hello', 'System', { temp: 0.5 });
    const fp1 = await fingerprinter.executionFingerprint(rendered, 'mock', 'model1');
    const fp2 = await fingerprinter.executionFingerprint(rendered, 'mock', 'model1');
    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprints for different providers', async () => {
    const rendered = await fingerprinter.renderedFingerprint('Hello', 'System', { temp: 0.5 });
    const fp1 = await fingerprinter.executionFingerprint(rendered, 'mock', 'model1');
    const fp2 = await fingerprinter.executionFingerprint(rendered, 'openai', 'gpt-4');
    expect(fp1).not.toBe(fp2);
  });

  it('produces stable replay fingerprints', async () => {
    const executionFp = 'abc123';
    const fp1 = await fingerprinter.replayFingerprint(executionFp, 'response text', 'stop', { promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    const fp2 = await fingerprinter.replayFingerprint(executionFp, 'response text', 'stop', { promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    expect(fp1).toBe(fp2);
  });
});

describe('canonical-hash', () => {
  it('sha256 produces consistent output', async () => {
    expect(await sha256('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('sha256Truncated returns first n chars', async () => {
    expect((await sha256Truncated('hello')).length).toBe(16);
    expect((await sha256Truncated('hello', 8)).length).toBe(8);
  });

  it('canonicalFingerprint is stable for same input', async () => {
    const fp1 = await canonicalFingerprint({ b: 1, a: 2 });
    const fp2 = await canonicalFingerprint({ a: 2, b: 1 });
    expect(fp1).toBe(fp2);
  });
});

describe('stable-json', () => {
  it('stableStringify sorts object keys', () => {
    const result = stableStringify({ b: 1, a: 2 });
    expect(result).toBe('{"a":2,"b":1}');
  });

  it('sortKeysDeep recursively sorts keys', () => {
    const result = sortKeysDeep({ b: { d: 1, c: 2 }, a: 3 }) as Record<string, unknown>;
    const keys = Object.keys(result);
    expect(keys).toEqual(['a', 'b']);
  });

  it('normalizeArrays sorts primitive arrays', () => {
    const result = normalizeArrays({ items: [3, 1, 2] }) as Record<string, unknown>;
    expect(result.items).toEqual([1, 2, 3]);
  });
});
