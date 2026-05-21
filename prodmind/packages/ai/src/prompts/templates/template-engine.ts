import { InvalidSyntaxError, UnclosedSectionError, UnresolvedVariableError } from './template-errors.ts';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface RenderedPrompt {
  text: string;
  variables: string[];
  sections: string[];
  fingerprint: string;
}

export class TemplateEngine {
  private readonly variablePattern = /\{\{([^#/]\w*)\}\}/g;
  private readonly sectionStartPattern = /\{\{#(\w+)\}\}/g;
  private readonly sectionEndPattern = /\{\{\/(\w+)\}\}/g;
  private readonly listPattern = /\{\{#list\s+(\w+)\}\}([\s\S]*?)\{\{\/list\}\}/g;

  public async render(template: string, context: Record<string, unknown>): Promise<RenderedPrompt> {
    this.validateSyntax(template);

    const sections = this.extractSections(template);

    // Process sections first to remove false section blocks
    let text = this.renderSections(template, context);
    // Process lists next to substitute iterator variables
    text = this.renderLists(text, context);

    // Now check for unresolved variables (section/list variables already resolved)
    const unresolved = this.findUnresolvedVariables(text, context);
    if (unresolved.length > 0) {
      throw new UnresolvedVariableError(unresolved);
    }

    const variables = this.extractVariables(text);
    text = this.renderVariables(text, context);
    text = text.replace(/\{\{\/\w+\}\}/g, '').trim();

    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text) as unknown as Uint8Array<ArrayBuffer>;
    const hashBytes = await crypto.subtle.digest('SHA-256', textBytes);
    const fingerprint = bytesToHex(new Uint8Array(hashBytes));

    return { text, variables, sections, fingerprint };
  }

  extractVariables(template: string): string[] {
    const vars = new Set<string>();
    let match: RegExpExecArray | null;

    this.variablePattern.lastIndex = 0;
    while ((match = this.variablePattern.exec(template)) !== null) {
      vars.add(match[1]!);
    }

    return [...vars].sort();
  }

  extractSections(template: string): string[] {
    const sections = new Set<string>();
    let match: RegExpExecArray | null;

    this.sectionStartPattern.lastIndex = 0;
    while ((match = this.sectionStartPattern.exec(template)) !== null) {
      sections.add(match[1]!);
    }

    return [...sections].sort();
  }

  findUnresolvedVariables(template: string, context: Record<string, unknown>): string[] {
    const variables = this.extractVariables(template);
    return variables.filter((v) => !(v in context));
  }

  validateSyntax(template: string): void {
    const openCount = (template.match(/\{\{/g) ?? []).length;
    const closeCount = (template.match(/\}\}/g) ?? []).length;
    if (openCount !== closeCount) {
      throw new InvalidSyntaxError('Unmatched or unclosed variable brackets', 0);
    }

    this.sectionStartPattern.lastIndex = 0;
    const starts: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = this.sectionStartPattern.exec(template)) !== null) {
      starts.push(match[1]!);
    }

    const ends: string[] = [];
    this.sectionEndPattern.lastIndex = 0;
    while ((match = this.sectionEndPattern.exec(template)) !== null) {
      ends.push(match[1]!);
    }

    for (const name of starts) {
      if (!ends.includes(name)) {
        throw new UnclosedSectionError(name);
      }
    }

    this.variablePattern.lastIndex = 0;
    while ((match = this.variablePattern.exec(template)) !== null) {
      if (!/^\w+$/.test(match[1]!)) {
        throw new InvalidSyntaxError(`Invalid variable name: ${match[1]}`, match.index);
      }
    }

    this.sectionStartPattern.lastIndex = 0;
    while ((match = this.sectionStartPattern.exec(template)) !== null) {
      if (!/^\w+$/.test(match[1]!)) {
        throw new InvalidSyntaxError(`Invalid section name: ${match[1]}`, match.index);
      }
    }
  }

  private renderVariables(text: string, context: Record<string, unknown>): string {
    return text.replace(this.variablePattern, (_, name: string) => {
      const value = context[name];
      return value === null || value === undefined ? '' : String(value);
    });
  }

  private renderSections(template: string, context: Record<string, unknown>): string {
    let result = template;

    const sectionPattern = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
    result = result.replace(sectionPattern, (_, name: string, content: string) => {
      return context[name] ? content : '';
    });

    return result;
  }

  private renderLists(template: string, context: Record<string, unknown>): string {
    return template.replace(this.listPattern, (_, listName: string, bodyTemplate: string) => {
      const list = context[listName];
      if (!Array.isArray(list)) return '';
      return list
        .map((item) => bodyTemplate.replace(/\{\{item\}\}/g, String(item)))
        .join('');
    });
  }
}
