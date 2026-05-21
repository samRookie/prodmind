import { describe, expect,it } from 'vitest';

import { TemplateEngine } from '../../prompts/templates/template-engine.ts';
import { InvalidSyntaxError,UnclosedSectionError, UnresolvedVariableError } from '../../prompts/templates/template-errors.ts';
import { LIST_TEMPLATE, MALFORMED_TEMPLATE, sampleContext,SECTION_TEMPLATE, SIMPLE_TEMPLATE, UNCLOSED_SECTION_TEMPLATE } from '../test-utils/sample-templates.ts';

describe('TemplateEngine', () => {
  const engine = new TemplateEngine();

  describe('render', () => {
    it('renders simple variable interpolation', async () => {
      const result = await engine.render(SIMPLE_TEMPLATE, { name: 'Alice', place: 'Wonderland' });
      expect(result.text).toBe('Hello Alice, welcome to Wonderland!');
    });

    it('renders section blocks conditionally', async () => {
      const withDetails = await engine.render(SECTION_TEMPLATE, { name: 'Bob', role: 'dev', level: '2', details: true, extras: false });
      expect(withDetails.text).toContain('Role: dev');
      expect(withDetails.text).not.toContain('Extra info:');

      const withoutDetails = await engine.render(SECTION_TEMPLATE, { name: 'Bob', role: 'dev', level: '2', details: false, extras: true, info: 'some info' });
      expect(withoutDetails.text).not.toContain('Role: dev');
      expect(withoutDetails.text).toContain('Extra info:');
    });

    it('renders list iteration', async () => {
      const result = await engine.render(LIST_TEMPLATE, { items: ['A', 'B', 'C'] });
      expect(result.text).toContain('- A');
      expect(result.text).toContain('- B');
      expect(result.text).toContain('- C');
    });

    it('produces byte-identical output for same inputs', async () => {
      const context = sampleContext();
      const result1 = await engine.render(SIMPLE_TEMPLATE, context);
      const result2 = await engine.render(SIMPLE_TEMPLATE, context);
      expect(result1.text).toBe(result2.text);
      expect(result1.fingerprint).toBe(result2.fingerprint);
    });

    it('returns fingerprint', async () => {
      const result = await engine.render(SIMPLE_TEMPLATE, { name: 'Alice', place: 'Wonderland' });
      expect(result.fingerprint).toBeDefined();
      expect(result.fingerprint.length).toBe(64);
    });

    it('extracts variables from rendered output', async () => {
      const result = await engine.render(SIMPLE_TEMPLATE, { name: 'Alice', place: 'Wonderland' });
      expect(result.variables).toEqual(['name', 'place']);
    });
  });

  describe('error handling', () => {
    it('throws on unresolved variables', async () => {
      await expect(engine.render(SIMPLE_TEMPLATE, { name: 'Alice' })).rejects.toThrow(UnresolvedVariableError);
    });

    it('throws on unclosed sections', async () => {
      await expect(engine.render(UNCLOSED_SECTION_TEMPLATE, { section: true })).rejects.toThrow(UnclosedSectionError);
    });

    it('throws on malformed variable syntax', async () => {
      await expect(engine.render(MALFORMED_TEMPLATE, { name: 'Alice' })).rejects.toThrow(InvalidSyntaxError);
    });
  });

  describe('extractVariables', () => {
    it('returns sorted unique variables', () => {
      const vars = engine.extractVariables(SIMPLE_TEMPLATE);
      expect(vars).toEqual(['name', 'place']);
    });

    it('does not include section names', () => {
      const vars = engine.extractVariables(SECTION_TEMPLATE);
      expect(vars).not.toContain('details');
      expect(vars).not.toContain('extras');
    });
  });

  describe('findUnresolvedVariables', () => {
    it('returns variables missing from context', () => {
      const unresolved = engine.findUnresolvedVariables(SIMPLE_TEMPLATE, { name: 'Alice' });
      expect(unresolved).toEqual(['place']);
    });

    it('returns empty array when all variables are satisfied', () => {
      const unresolved = engine.findUnresolvedVariables(SIMPLE_TEMPLATE, { name: 'Alice', place: 'Wonderland' });
      expect(unresolved).toEqual([]);
    });
  });
});
