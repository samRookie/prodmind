import type { InsightConfiguration } from '../contracts/index.ts';
import { DEFAULT_INSIGHT_CONFIG } from '../contracts/index.ts';
import type { InsightCategory, InsightSeverity, InsightStatus } from '../types/index.ts';
import type { Insight } from '../types/index.ts';
import { InsightPipeline } from './insight-pipeline.ts';
import { InsightState } from './insight-state.ts';

export class InsightEngine {
  private pipeline: InsightPipeline;
  private config: InsightConfiguration;

  constructor(config?: Partial<InsightConfiguration>) {
    this.config = { ...DEFAULT_INSIGHT_CONFIG, ...config };
    this.pipeline = new InsightPipeline(this.config);
  }

  ingest(insight: Insight): Insight {
    return this.pipeline.process(insight);
  }

  ingestBatch(insights: Insight[]): Insight[] {
    return this.pipeline.processBatch(insights);
  }

  query(category?: InsightCategory, severity?: InsightSeverity, status?: InsightStatus): Insight[] {
    let results = this.pipeline.getState().getAll();
    if (category) results = results.filter(i => i.category === category);
    if (severity) results = results.filter(i => i.severity === severity);
    if (status) results = results.filter(i => i.status === status);
    return results.sort((a, b) => b.scores.overall - a.scores.overall);
  }

  getInsight(id: string): Insight | undefined {
    return this.pipeline.getState().get(id);
  }

  updateStatus(id: string, status: InsightStatus): void {
    this.pipeline.getState().updateStatus(id, status);
  }

  getInsightState(): InsightState {
    return this.pipeline.getState();
  }

  getConfiguration(): InsightConfiguration {
    return { ...this.config };
  }
}
