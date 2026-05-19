import { eq, and, inArray } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { graphMetrics } from '../schema/graph-metrics.ts';
import type { GraphMetricsRow, NewGraphMetricsRow } from '../schema/graph-metrics.ts';
import { generateId, now } from '../utils.ts';
import type { Result } from '@prodmind/contracts';
import { MetricPriority } from '@prodmind/contracts';

export interface MetricInsertInput {
  metricType: string;
  metricScope: string;
  nodeId: string | null;
  metricValue: number;
  metricClassification: string | null;
  metricPriority: string;
  metadataJson: string | null;
}

export class MetricsRepository {
  constructor(private db: Database) {}

  async insertMetrics(
    snapshotId: string,
    inputs: MetricInsertInput[],
  ): Promise<Result<GraphMetricsRow[], string>> {
    try {
      const filtered = inputs.filter(
        (i) => i.metricPriority !== MetricPriority.LOW,
      );

      if (filtered.length === 0) {
        return { success: true, data: [] };
      }

      const result = await this.db.transaction(async (tx) => {
        const inserted: GraphMetricsRow[] = [];
        const batchSize = 100;
        for (let i = 0; i < filtered.length; i += batchSize) {
          const batch = filtered.slice(i, i + batchSize);
          const values: NewGraphMetricsRow[] = batch.map((input) => ({
            id: generateId(),
            snapshotId,
            metricType: input.metricType,
            metricScope: input.metricScope,
            nodeId: input.nodeId ?? null,
            metricValue: input.metricValue,
            metricClassification: input.metricClassification ?? null,
            metricPriority: input.metricPriority,
            metadataJson: input.metadataJson ?? null,
            createdAt: now(),
          }));
          const rows = await tx.insert(graphMetrics).values(values).returning();
          inserted.push(...rows);
        }
        return inserted;
      });
      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Metrics insertion failed',
      };
    }
  }

  async getMetricsBySnapshot(
    snapshotId: string,
    minPriority?: string,
  ): Promise<GraphMetricsRow[]> {
    const conditions = [eq(graphMetrics.snapshotId, snapshotId)];
    if (minPriority) {
      const priorityOrder = [MetricPriority.LOW, MetricPriority.IMPORTANT, MetricPriority.CRITICAL];
      const allowedPriorities = priorityOrder.slice(
        priorityOrder.indexOf(minPriority as MetricPriority),
      );
      conditions.push(inArray(graphMetrics.metricPriority, allowedPriorities));
    }
    return this.db
      .select()
      .from(graphMetrics)
      .where(and(...conditions))
      .orderBy(graphMetrics.metricType, graphMetrics.metricScope, graphMetrics.nodeId);
  }

  async getMetricsByNode(nodeId: string, snapshotId: string): Promise<GraphMetricsRow[]> {
    return this.db
      .select()
      .from(graphMetrics)
      .where(
        and(
          eq(graphMetrics.nodeId, nodeId),
          eq(graphMetrics.snapshotId, snapshotId),
        ),
      )
      .orderBy(graphMetrics.metricType);
  }

  async getMetricsByType(metricType: string, snapshotId: string): Promise<GraphMetricsRow[]> {
    return this.db
      .select()
      .from(graphMetrics)
      .where(
        and(
          eq(graphMetrics.metricType, metricType),
          eq(graphMetrics.snapshotId, snapshotId),
        ),
      )
      .orderBy(graphMetrics.metricValue);
  }

  async deleteMetricsBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(graphMetrics).where(eq(graphMetrics.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete metrics',
      };
    }
  }
}
