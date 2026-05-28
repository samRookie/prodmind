import type { Insight, InsightStatus } from '../types/index.ts';

export class InsightState {
  private insights: Map<string, Insight> = new Map();

  add(insight: Insight): void {
    this.insights.set(insight.id, insight);
  }

  get(id: string): Insight | undefined {
    return this.insights.get(id);
  }

  updateStatus(id: string, status: InsightStatus): void {
    const insight = this.insights.get(id);
    if (insight) {
      insight.status = status;
    }
  }

  remove(id: string): void {
    this.insights.delete(id);
  }

  getAll(): Insight[] {
    return Array.from(this.insights.values());
  }

  clear(): void {
    this.insights.clear();
  }

  size(): number {
    return this.insights.size;
  }
}
