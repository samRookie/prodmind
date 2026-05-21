export interface AccessRule {
  readonly toolId: string;
  readonly allowedSources: readonly string[];
}

export class AccessControl {
  private readonly _rules: Map<string, AccessRule> = new Map();

  addRule(toolId: string, allowedSources: readonly string[]): void {
    this._rules.set(toolId, Object.freeze({
      toolId, allowedSources: Object.freeze([...allowedSources]),
    }));
  }

  isAllowed(toolId: string, source: string): boolean {
    const rule = this._rules.get(toolId);
    if (!rule) return true; // no rule = allowed
    return rule.allowedSources.includes(source);
  }

  getRule(toolId: string): AccessRule | undefined {
    return this._rules.get(toolId);
  }

  removeRule(toolId: string): void {
    this._rules.delete(toolId);
  }

  clear(): void {
    this._rules.clear();
  }
}
