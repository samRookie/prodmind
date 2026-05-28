import type { Rule } from './rule-types.ts';

export class RuleRegistry {
  private rules: Map<string, Rule> = new Map();
  private frozen = false;

  register(rule: Rule): void {
    if (this.frozen) {
      throw new Error('RuleRegistry is frozen — cannot register new rules');
    }
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with id '${rule.id}' is already registered`);
    }
    this.rules.set(rule.id, { ...rule });
  }

  registerBatch(rules: Rule[]): void {
    for (const rule of rules) {
      this.register(rule);
    }
  }

  get(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  getAll(): Rule[] {
    return [...this.rules.values()]
      .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  }

  getByCategory(category: string): Rule[] {
    return this.getAll().filter((r) => r.category === category);
  }

  getCount(): number {
    return this.rules.size;
  }

  freeze(): void {
    this.frozen = true;
  }

  isFrozen(): boolean {
    return this.frozen;
  }

  clear(): void {
    if (this.frozen) {
      throw new Error('RuleRegistry is frozen — cannot clear');
    }
    this.rules.clear();
  }
}
