export interface RetentionRule {
  readonly category: string;
  readonly maxRecords: number;
  readonly ttlMs: number;
}

export class RetentionPolicy {
  private readonly _rules: Map<string, RetentionRule> = new Map();

  addRule(rule: RetentionRule): void {
    this._rules.set(rule.category, rule);
  }

  removeRule(category: string): void {
    this._rules.delete(category);
  }

  getRule(category: string): RetentionRule | undefined {
    return this._rules.get(category);
  }

  get rules(): readonly RetentionRule[] {
    return Object.freeze([...this._rules.values()]);
  }

  ruleCount(): number {
    return this._rules.size;
  }

  clear(): void {
    this._rules.clear();
  }
}
