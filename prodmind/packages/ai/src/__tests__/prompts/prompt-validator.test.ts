import { describe, expect,it } from 'vitest';

import { PromptValidator } from '../../prompts/validation/prompt-validator.ts';
import { validateNoDuplicateVariables, validatePrompt,validateRenderedPrompt, validateTemplateSyntax, validateTokenRisk } from '../../prompts/validation/validation-rules.ts';
import { MALFORMED_TEMPLATE,SIMPLE_TEMPLATE } from '../test-utils/sample-templates.ts';

describe('PromptValidator', () => {
  const validator = new PromptValidator();

  describe('validateBeforeRender', () => {
    it('passes valid templates', () => {
      const result = validator.validateBeforeRender(SIMPLE_TEMPLATE);
      expect(result.valid).toBe(true);
    });

    it('fails malformed templates', () => {
      const result = validator.validateBeforeRender(MALFORMED_TEMPLATE);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAfterRender', () => {
    it('passes valid rendered prompt', async () => {
      const result = await validator.validateAfterRender(
        SIMPLE_TEMPLATE,
        { name: 'Alice', place: 'Wonderland' },
        1000,
      );
      expect(result.valid).toBe(true);
    });

    it('warns on token risk', async () => {
      const result = await validator.validateAfterRender(
        'A'.repeat(5000),
        {},
        100,
      );
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('validates full prompt lifecycle', async () => {
      const result = await validator.validate(
        SIMPLE_TEMPLATE,
        { name: 'Alice', place: 'Wonderland' },
        1000,
      );
      expect(result.valid).toBe(true);
    });
  });
});

describe('validation-rules', () => {
  describe('validateRenderedPrompt', () => {
    it('detects empty prompt', () => {
      const errors = validateRenderedPrompt('');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.code).toBe('EMPTY_PROMPT');
    });

    it('passes non-empty prompt', () => {
      const errors = validateRenderedPrompt('Hello world');
      expect(errors.length).toBe(0);
    });
  });

  describe('validateTokenRisk', () => {
    it('warns when prompt exceeds threshold', () => {
      const warnings = validateTokenRisk('A'.repeat(1000), 100);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('no warning under threshold', () => {
      const warnings = validateTokenRisk('short', 1000);
      expect(warnings.length).toBe(0);
    });
  });

  describe('validateTemplateSyntax', () => {
    it('detects invalid syntax', () => {
      const errors = validateTemplateSyntax(MALFORMED_TEMPLATE);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('passes valid syntax', () => {
      const errors = validateTemplateSyntax(SIMPLE_TEMPLATE);
      expect(errors.length).toBe(0);
    });
  });

  describe('validateNoDuplicateVariables', () => {
    it('detects duplicate variables', () => {
      const errors = validateNoDuplicateVariables('{{x}} {{x}} {{y}}');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('passes unique variables', () => {
      const errors = validateNoDuplicateVariables('{{x}} {{y}}');
      expect(errors.length).toBe(0);
    });
  });

  describe('validatePrompt', () => {
    it('fails invalid template', async () => {
      const result = await validatePrompt(MALFORMED_TEMPLATE, { name: 'Alice' }, 1000);
      expect(result.valid).toBe(false);
    });

    it('fails unresolved variables', async () => {
      const result = await validatePrompt(SIMPLE_TEMPLATE, { name: 'Alice' }, 1000);
      expect(result.valid).toBe(false);
    });
  });
});
