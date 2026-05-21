import type { MemoryRecord } from '../contracts/memory-record.ts';
import { MemoryBudget } from './memory-budget.ts';
import { RetentionPolicy, type RetentionRule } from './retention-policy.ts';

export interface EnforceResult {
  readonly removedRecords: number;
  readonly violations: number;
}

export class MemoryGovernor {
  readonly retentionPolicy: RetentionPolicy;
  readonly budget: MemoryBudget;

  constructor() {
    this.retentionPolicy = new RetentionPolicy();
    this.budget = new MemoryBudget();
  }

  enforceRetention(records: readonly MemoryRecord[]): EnforceResult {
    let removedRecords = 0;
    const categories = new Map<string, MemoryRecord[]>();

    for (const r of records) {
      const cat = r.category;
      const existing = categories.get(cat) ?? [];
      existing.push(r);
      categories.set(cat, existing);
    }

    for (const [category, catRecords] of categories) {
      const rule = this.retentionPolicy.getRule(category);
      if (!rule) continue;

      catRecords.sort((a, b) => a.id.localeCompare(b.id));

      if (catRecords.length > rule.maxRecords) {
        removedRecords += catRecords.length - rule.maxRecords;
        catRecords.splice(0, catRecords.length - rule.maxRecords);
      }
    }

    return Object.freeze({ removedRecords, violations: 0 });
  }

  enforceBudget(): EnforceResult {
    const violations = this.budget.allocations.filter(
      a => !this.budget.isWithinBudget(a.category),
    ).length;
    return Object.freeze({ removedRecords: 0, violations });
  }

  configureDefaultRules(): void {
    const defaults: RetentionRule[] = [
      { category: 'execution', maxRecords: 100, ttlMs: 86_400_000 },
      { category: 'session', maxRecords: 50, ttlMs: 604_800_000 },
      { category: 'metrics', maxRecords: 200, ttlMs: 2_592_000_000 },
    ];
    for (const rule of defaults) this.retentionPolicy.addRule(rule);
  }

  configureDefaultBudget(): void {
    this.budget.allocate('execution', 10_000, 100);
    this.budget.allocate('session', 5_000, 50);
    this.budget.allocate('metrics', 2_000, 200);
  }
}
