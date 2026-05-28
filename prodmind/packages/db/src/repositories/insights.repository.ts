import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { graphInsights } from '../schema/graph-insights.ts';
import { ruleExecutions } from '../schema/rule-executions.ts';
import { evidenceLinks } from '../schema/evidence-links.ts';
import { architectureFindings } from '../schema/architecture-findings.ts';
import { generateId, now } from '../utils.ts';
import type { NewGraphInsight, GraphInsight } from '../schema/graph-insights.ts';
import type { NewRuleExecution, RuleExecution } from '../schema/rule-executions.ts';
import type { NewEvidenceLink, EvidenceLink } from '../schema/evidence-links.ts';
import type { NewArchitectureFinding, ArchitectureFinding } from '../schema/architecture-findings.ts';
import type { Result } from '@prodmind/contracts';

const BATCH_SIZE = 100;

export class InsightsRepository {
  constructor(private db: Database) {}

  async insertInsights(
    inputs: Omit<NewGraphInsight, 'id' | 'createdAt'>[],
  ): Promise<Result<GraphInsight[], string>> {
    try {
      const values: NewGraphInsight[] = inputs.map((input) => ({
        id: generateId(),
        snapshotId: input.snapshotId,
        insightType: input.insightType,
        severity: input.severity,
        scope: input.scope,
        fingerprint: input.fingerprint,
        title: input.title,
        summary: input.summary,
        metadataJson: input.metadataJson ?? null,
        createdAt: now(),
      }));

      const inserted: GraphInsight[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(graphInsights).values(batch).returning();
        inserted.push(...result);
      }

      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert insights failed' };
    }
  }

  async insertRuleExecutions(
    inputs: Omit<NewRuleExecution, 'id'>[],
  ): Promise<Result<RuleExecution[], string>> {
    try {
      const values: NewRuleExecution[] = inputs.map((input) => ({
        id: generateId(),
        snapshotId: input.snapshotId,
        ruleId: input.ruleId,
        executionTimeMs: input.executionTimeMs,
        emittedInsightCount: input.emittedInsightCount,
        metadataJson: input.metadataJson ?? null,
      }));

      const inserted: RuleExecution[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(ruleExecutions).values(batch).returning();
        inserted.push(...result);
      }

      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert rule executions failed' };
    }
  }

  async insertEvidenceLinks(
    inputs: Omit<NewEvidenceLink, 'id' | 'createdAt'>[],
  ): Promise<Result<EvidenceLink[], string>> {
    try {
      const values: NewEvidenceLink[] = inputs.map((input) => ({
        id: generateId(),
        snapshotId: input.snapshotId,
        insightId: input.insightId,
        nodeId: input.nodeId ?? null,
        edgeId: input.edgeId ?? null,
        metricType: input.metricType ?? null,
        metadataJson: input.metadataJson ?? null,
        createdAt: now(),
      }));

      const inserted: EvidenceLink[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(evidenceLinks).values(batch).returning();
        inserted.push(...result);
      }

      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert evidence links failed' };
    }
  }

  async insertArchitectureFindings(
    inputs: Omit<NewArchitectureFinding, 'id' | 'createdAt'>[],
  ): Promise<Result<ArchitectureFinding[], string>> {
    try {
      const values: NewArchitectureFinding[] = inputs.map((input) => ({
        id: generateId(),
        snapshotId: input.snapshotId,
        category: input.category,
        severity: input.severity,
        findingFingerprint: input.findingFingerprint,
        metadataJson: input.metadataJson ?? null,
        createdAt: now(),
      }));

      const inserted: ArchitectureFinding[] = [];
      for (let i = 0; i < values.length; i += BATCH_SIZE) {
        const batch = values.slice(i, i + BATCH_SIZE);
        const result = await this.db.insert(architectureFindings).values(batch).returning();
        inserted.push(...result);
      }

      return { success: true, data: inserted };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert architecture findings failed' };
    }
  }

  async getInsightsBySnapshot(snapshotId: string): Promise<GraphInsight[]> {
    return this.db
      .select()
      .from(graphInsights)
      .where(eq(graphInsights.snapshotId, snapshotId))
      .orderBy(graphInsights.createdAt);
  }

  async getInsightsBySeverity(severity: string): Promise<GraphInsight[]> {
    return this.db
      .select()
      .from(graphInsights)
      .where(eq(graphInsights.severity, severity))
      .orderBy(graphInsights.createdAt);
  }

  async getInsightsByNode(nodeId: string): Promise<GraphInsight[]> {
    const links = await this.db
      .select({ insightId: evidenceLinks.insightId })
      .from(evidenceLinks)
      .where(eq(evidenceLinks.nodeId, nodeId));

    if (links.length === 0) return [];

    const insightIds = [...new Set(links.map((l) => l.insightId))];

    return this.db
      .select()
      .from(graphInsights)
      .where(and(...insightIds.map((id) => eq(graphInsights.id, id))))
      .orderBy(graphInsights.createdAt);
  }

  async getFindingsBySnapshot(snapshotId: string): Promise<ArchitectureFinding[]> {
    return this.db
      .select()
      .from(architectureFindings)
      .where(eq(architectureFindings.snapshotId, snapshotId))
      .orderBy(architectureFindings.createdAt);
  }

  async getRuleExecutionsBySnapshot(snapshotId: string): Promise<RuleExecution[]> {
    return this.db
      .select()
      .from(ruleExecutions)
      .where(eq(ruleExecutions.snapshotId, snapshotId))
      .orderBy(ruleExecutions.ruleId);
  }

  async deleteSnapshotInsights(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(graphInsights).where(eq(graphInsights.snapshotId, snapshotId));
      await this.db.delete(ruleExecutions).where(eq(ruleExecutions.snapshotId, snapshotId));
      await this.db.delete(evidenceLinks).where(eq(evidenceLinks.snapshotId, snapshotId));
      await this.db.delete(architectureFindings).where(eq(architectureFindings.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete snapshot insights failed' };
    }
  }
}
