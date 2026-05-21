import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { validationResults, snapshotIntegrity } from '../schema/validation-results.ts';
import type { ValidationResultRow, NewValidationResultRow, SnapshotIntegrityRow } from '../schema/validation-results.ts';
import { generateId, now } from '../utils.ts';

export interface ValidationSummary {
  snapshotId: string;
  totalIssues: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
}

export class ValidationRepository {
  constructor(private db: Database) {}

  async insertValidationIssues(
    snapshotId: string,
    issues: Array<{
      category: string;
      severity: string;
      state: string;
      issueCode: string;
      message: string;
      nodeId: string | null;
      edgeId: string | null;
      metadataJson: string | null;
    }>,
  ): Promise<boolean> {
    const timestamp = now();
    const values: NewValidationResultRow[] = issues.map((issue) => ({
      id: generateId(),
      snapshotId,
      category: issue.category,
      severity: issue.severity,
      state: issue.state,
      issueCode: issue.issueCode,
      message: issue.message,
      nodeId: issue.nodeId,
      edgeId: issue.edgeId,
      metadataJson: issue.metadataJson,
      createdAt: timestamp,
    }));

    if (values.length > 0) {
      await this.db.insert(validationResults).values(values);
    }
    return true;
  }

  async insertSnapshotIntegrity(
    snapshotId: string,
    data: {
      integrityScore: number;
      readinessScore: number;
      validationState: string;
      criticalIssueCount: number;
      warningCount: number;
      metadataJson: string | null;
    },
  ): Promise<boolean> {
    await this.db.insert(snapshotIntegrity).values({
      id: generateId(),
      snapshotId,
      integrityScore: data.integrityScore,
      readinessScore: data.readinessScore,
      validationState: data.validationState,
      criticalIssueCount: data.criticalIssueCount,
      warningCount: data.warningCount,
      metadataJson: data.metadataJson,
      createdAt: now(),
    });
    return true;
  }

  async getValidationIssues(
    snapshotId: string,
    options?: { severity?: string; category?: string },
  ): Promise<ValidationResultRow[]> {
    const conditions = [eq(validationResults.snapshotId, snapshotId)];

    if (options?.severity) {
      conditions.push(eq(validationResults.severity, options.severity));
    }
    if (options?.category) {
      conditions.push(eq(validationResults.category, options.category));
    }

    return this.db
      .select()
      .from(validationResults)
      .where(and(...conditions))
      .orderBy(validationResults.severity, validationResults.issueCode);
  }

  async getSnapshotIntegrity(snapshotId: string): Promise<SnapshotIntegrityRow | null> {
    const rows = await this.db
      .select()
      .from(snapshotIntegrity)
      .where(eq(snapshotIntegrity.snapshotId, snapshotId))
      .limit(1);

    return rows[0] ?? null;
  }

  async deleteSnapshotValidation(snapshotId: string): Promise<boolean> {
    await this.db.delete(validationResults).where(eq(validationResults.snapshotId, snapshotId));
    await this.db.delete(snapshotIntegrity).where(eq(snapshotIntegrity.snapshotId, snapshotId));
    return true;
  }

  async getCriticalIssues(snapshotId: string): Promise<ValidationResultRow[]> {
    return this.db
      .select()
      .from(validationResults)
      .where(
        and(
          eq(validationResults.snapshotId, snapshotId),
          eq(validationResults.severity, 'CRITICAL'),
        ),
      )
      .orderBy(validationResults.issueCode);
  }

  async getValidationSummary(snapshotId: string): Promise<ValidationSummary> {
    const issues = await this.getValidationIssues(snapshotId);

    let criticalCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    const bySeverity: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const issue of issues) {
      switch (issue.severity) {
        case 'CRITICAL': criticalCount++; break;
        case 'ERROR': errorCount++; break;
        case 'WARNING': warningCount++; break;
        case 'INFO': infoCount++; break;
      }
      bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
      byCategory[issue.category] = (byCategory[issue.category] ?? 0) + 1;
    }

    return {
      snapshotId,
      totalIssues: issues.length,
      criticalCount,
      errorCount,
      warningCount,
      infoCount,
      bySeverity,
      byCategory,
    };
  }
}
