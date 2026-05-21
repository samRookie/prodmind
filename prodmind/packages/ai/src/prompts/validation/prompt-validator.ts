import { TemplateEngine } from '../templates/template-engine.ts';
import type { RenderedPrompt } from '../templates/template-engine.ts';
import { validateRenderedPrompt, validateTokenRisk, validateTemplateSyntax, validateNoDuplicateVariables, validatePrompt } from './validation-rules.ts';
import type { ValidationResult, ValidationWarning } from './validation-rules.ts';

export class PromptValidator {
  private readonly engine = new TemplateEngine();

  public validateBeforeRender(template: string): ValidationResult {
    const errors: ValidationWarning[] = [];
    const warnings: ValidationWarning[] = [];

    const syntaxErrors = validateTemplateSyntax(template);
    errors.push(...syntaxErrors);

    const duplicateErrors = validateNoDuplicateVariables(template);
    errors.push(...duplicateErrors);

    return { valid: errors.length === 0, errors, warnings };
  }

  public async validateAfterRender(
    template: string,
    context: Record<string, unknown>,
    maxTokens: number,
  ): Promise<ValidationResult> {
    const errors: ValidationWarning[] = [];
    const warnings: ValidationWarning[] = [];

    let rendered: RenderedPrompt;
    try {
      rendered = await this.engine.render(template, context);
    } catch (e) {
      if (e instanceof Error) {
        errors.push({ code: 'RENDER_ERROR', message: e.message });
      }
      return { valid: false, errors, warnings };
    }

    const emptyErrors = validateRenderedPrompt(rendered.text);
    errors.push(...emptyErrors);

    const tokenWarnings = validateTokenRisk(rendered.text, maxTokens);
    warnings.push(...tokenWarnings);

    return { valid: errors.length === 0, errors, warnings };
  }

  public async validate(template: string, context: Record<string, unknown>, maxTokens: number): Promise<ValidationResult> {
    return validatePrompt(template, context, maxTokens);
  }
}
