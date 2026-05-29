import type { EvolutionPoint, MetricTrajectory, RemediationRecord } from '../types/index.ts';
import { detectArchitectureRegression } from './architecture-regression.ts';
import { detectComplexityRegression } from './complexity-regression.ts';
import { detectRemediationRegression } from './remediation-regression.ts';

export interface RegressionAnalysisResult {
  architectureRegression: ReturnType<typeof detectArchitectureRegression>;
  complexityRegression: ReturnType<typeof detectComplexityRegression>;
  remediationRegression: ReturnType<typeof detectRemediationRegression> | null;
  hasAnyRegression: boolean;
  summary: string;
}

export class RegressionEngine {
  analyze(
    earlier: EvolutionPoint[],
    later: EvolutionPoint[],
    complexityTrajectory: MetricTrajectory,
    remediationRecords?: RemediationRecord[],
  ): RegressionAnalysisResult {
    const architectureRegression = detectArchitectureRegression(earlier, later);
    const complexityRegression = detectComplexityRegression(complexityTrajectory);
    const remediationRegression = remediationRecords
      ? detectRemediationRegression(remediationRecords)
      : null;
    const hasAnyRegression = architectureRegression.hasRegression
      || complexityRegression.hasRegression
      || (remediationRegression?.hasRegression ?? false);
    return {
      architectureRegression,
      complexityRegression,
      remediationRegression,
      hasAnyRegression,
      summary: hasAnyRegression ? 'Regression detected in architecture health' : 'No significant regression detected',
    };
  }
}
