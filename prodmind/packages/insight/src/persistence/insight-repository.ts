import type { DriftReport,Insight, InsightEvidence, RemediationPlan } from '../types/index.ts';

interface StorageAdapter {
  save(key: string, value: unknown): Promise<void>;
  get<T>(key: string): Promise<T | null>;
  query<T>(prefix: string): Promise<T[]>;
  delete(key: string): Promise<void>;
}

export class InsightRepository {
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  async saveInsight(insight: Insight): Promise<void> {
    await this.storage.save(`insight:${insight.id}`, insight);
  }

  async getInsight(id: string): Promise<Insight | null> {
    return this.storage.get<Insight>(`insight:${id}`);
  }

  async queryInsights(): Promise<Insight[]> {
    return this.storage.query<Insight>('insight:');
  }

  async deleteInsight(id: string): Promise<void> {
    await this.storage.delete(`insight:${id}`);
  }

  async saveEvidence(evidence: InsightEvidence): Promise<void> {
    await this.storage.save(`evidence:${evidence.id}`, evidence);
  }

  async saveRemediation(plan: RemediationPlan): Promise<void> {
    await this.storage.save(`remediation:${plan.id}`, plan);
  }

  async saveDriftReport(report: DriftReport): Promise<void> {
    await this.storage.save(`drift:${report.id}`, report);
  }
}
