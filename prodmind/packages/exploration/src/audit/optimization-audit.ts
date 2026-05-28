import { nowISO } from '../utils/index.ts';

export class OptimizationAudit {
  private entries: Array<{
    operation: string;
    strategy: string;
    estimatedCost: number;
    actualCost: number;
    savings: number;
    cached: boolean;
    timestamp: string;
  }> = [];

  public recordOptimization(
    operation: string,
    strategy: string,
    estimatedCost: number,
    actualCost: number,
    cached: boolean,
  ): void {
    this.entries.push({
      operation,
      strategy,
      estimatedCost,
      actualCost,
      savings: estimatedCost - actualCost,
      cached,
      timestamp: nowISO(),
    });
  }

  public getOptimizationAudit(): Array<{
    operation: string;
    strategy: string;
    estimatedCost: number;
    actualCost: number;
    savings: number;
    cached: boolean;
    timestamp: string;
  }> {
    return [...this.entries];
  }

  public verifyOptimizationCorrectness(): {
    verified: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    for (const entry of this.entries) {
      if (entry.estimatedCost < 0) {
        issues.push(
          `${entry.operation}: negative estimatedCost ${entry.estimatedCost}`,
        );
      }
      if (entry.actualCost < 0) {
        issues.push(
          `${entry.operation}: negative actualCost ${entry.actualCost}`,
        );
      }
      if (entry.savings !== entry.estimatedCost - entry.actualCost) {
        issues.push(
          `${entry.operation}: savings ${entry.savings} does not match estimatedCost - actualCost`,
        );
      }
    }
    return { verified: issues.length === 0, issues };
  }

  public getSavingsReport(): {
    totalSavings: number;
    avgSavings: number;
    byOperation: Record<string, number>;
  } {
    if (this.entries.length === 0) {
      return { totalSavings: 0, avgSavings: 0, byOperation: {} };
    }
    const totalSavings = this.entries.reduce((s, e) => s + e.savings, 0);
    const byOperation: Record<string, number> = {};
    for (const entry of this.entries) {
      byOperation[entry.operation] =
        (byOperation[entry.operation] ?? 0) + entry.savings;
    }
    return {
      totalSavings,
      avgSavings: totalSavings / this.entries.length,
      byOperation,
    };
  }

  public clear(): void {
    this.entries = [];
  }
}
