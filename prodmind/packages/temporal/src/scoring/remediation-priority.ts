import type { RemediationRecord } from '../types/index.ts';

export interface RemediationPriority {
  remediationId: string;
  priority: number;
  effectiveness: number;
}

export function prioritizeRemediations(records: RemediationRecord[]): RemediationPriority[] {
  return records
    .map((r) => {
      const effectiveness = r.successScore * 0.5 + r.impactScore * 0.3 - r.regressionScore * 0.2;
      return {
        remediationId: r.id,
        priority: effectiveness,
        effectiveness,
      };
    })
    .sort((a, b) => b.priority - a.priority);
}
