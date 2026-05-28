import type { InsightConfiguration } from '../contracts/index.ts';
import type { Insight, InsightCategory } from '../types/index.ts';
import { InsightState } from './insight-state.ts';

export class InsightPipeline {
  private state: InsightState;
  private config: InsightConfiguration;

  constructor(config: InsightConfiguration, state?: InsightState) {
    this.config = config;
    this.state = state ?? new InsightState();
  }

  process(insight: Insight): Insight {
    if (!this.config.categories.includes(insight.category)) {
      throw new Error(`Category ${insight.category} not enabled`);
    }
    if (!this.config.severities.includes(insight.severity)) {
      throw new Error(`Severity ${insight.severity} not enabled`);
    }
    this.state.add(insight);
    return insight;
  }

  processBatch(insights: Insight[]): Insight[] {
    const result: Insight[] = [];
    const perCategory = new Map<InsightCategory, number>();
    for (const insight of insights) {
      const cat = insight.category;
      const count = perCategory.get(cat) ?? 0;
      if (count >= this.config.maxInsightsPerCategory) continue;
      perCategory.set(cat, count + 1);
      result.push(this.process(insight));
    }
    return result;
  }

  getState(): InsightState {
    return this.state;
  }
}
