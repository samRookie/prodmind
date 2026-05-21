import { TemplateEngine } from '../templates/template-engine.ts';

export interface ValidationWarning {
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationWarning[];
  warnings: ValidationWarning[];
}

export function validateRenderedPrompt(renderedText: string): ValidationWarning[] {
  const errors: ValidationWarning[] = [];

  if (!renderedText.trim()) {
    errors.push({ code: 'EMPTY_PROMPT', message: 'Rendered prompt is empty' });
  }

  return errors;
}

export function validateTokenRisk(renderedText: string, maxTokens: number, threshold = 0.8): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const estimatedTokens = Math.ceil(renderedText.length / 4);

  if (estimatedTokens > maxTokens * threshold) {
    warnings.push({
      code: 'TOKEN_RISK',
      message: `Rendered prompt ~${estimatedTokens} tokens exceeds ${Math.round(threshold * 100)}% of ${maxTokens} limit`,
    });
  }

  return warnings;
}

export function validateTemplateSyntax(template: string): ValidationWarning[] {
  const errors: ValidationWarning[] = [];
  const engine = new TemplateEngine();

  try {
    engine.validateSyntax(template);
  } catch (e) {
    if (e instanceof Error) {
      errors.push({ code: 'INVALID_SYNTAX', message: e.message });
    }
  }

  return errors;
}

export function validateNoDuplicateVariables(template: string): ValidationWarning[] {
  const errors: ValidationWarning[] = [];
  const varPattern = /\{\{([^#/]\w*)\}\}/g;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = varPattern.exec(template)) !== null) {
    const name = match[1]!;
    if (seen.has(name)) {
      errors.push({ code: 'DUPLICATE_VARIABLE', message: `Duplicate variable: ${name}` });
    }
    seen.add(name);
  }

  return errors;
}

export async function validatePrompt(template: string, context: Record<string, unknown>, maxTokens: number): Promise<ValidationResult> {
  const errors: ValidationWarning[] = [];
  const warnings: ValidationWarning[] = [];

  const syntaxErrors = validateTemplateSyntax(template);
  errors.push(...syntaxErrors);

  const duplicateErrors = validateNoDuplicateVariables(template);
  errors.push(...duplicateErrors);

  if (errors.length === 0) {
    const engine = new TemplateEngine();
    try {
      const rendered = await engine.render(template, context);
      const emptyErrors = validateRenderedPrompt(rendered.text);
      errors.push(...emptyErrors);

      const tokenWarnings = validateTokenRisk(rendered.text, maxTokens);
      warnings.push(...tokenWarnings);
    } catch (e) {
      if (e instanceof Error) {
        errors.push({ code: 'RENDER_ERROR', message: e.message });
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
