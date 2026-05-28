import type { RiskInput, RiskOutput } from './risk-types.ts';
import { correlateRisks } from './risk-correlator.ts';
import { rankRisks } from './risk-ranking.ts';

export class RiskEngine {
  analyze(input: RiskInput): RiskOutput {
    const correlations = correlateRisks(input);
    const ranked = rankRisks(correlations);
    return { snapshotId: input.snapshotId, correlations: ranked, generatedAt: new Date().toISOString(), };
  }
}
