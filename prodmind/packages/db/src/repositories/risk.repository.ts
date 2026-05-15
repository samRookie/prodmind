import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { risks } from '../schema/risks.ts';
import { generateId, now } from '../utils.ts';
import type { Risk, NewRisk } from '../schema/risks.ts';

export class RiskRepository {
  constructor(private db: Database) {}

  async create(input: Omit<NewRisk, 'id' | 'createdAt'>): Promise<Risk> {
    const [risk] = await this.db
      .insert(risks)
      .values({
        id: generateId(),
        snapshotId: input.snapshotId,
        nodeId: input.nodeId,
        severity: input.severity,
        category: input.category,
        title: input.title,
        description: input.description ?? null,
        fingerprint: input.fingerprint ?? null,
        createdAt: now(),
        lastSeenSnapshotId: input.lastSeenSnapshotId ?? null,
      })
      .returning();

    return risk!;
  }

  async findBySnapshot(snapshotId: string): Promise<Risk[]> {
    return this.db
      .select()
      .from(risks)
      .where(eq(risks.snapshotId, snapshotId))
      .orderBy(risks.createdAt);
  }

  async findByNode(nodeId: string): Promise<Risk[]> {
    return this.db
      .select()
      .from(risks)
      .where(eq(risks.nodeId, nodeId))
      .orderBy(risks.createdAt);
  }

  async findByFingerprint(fingerprint: string): Promise<Risk | null> {
    const [result] = await this.db
      .select()
      .from(risks)
      .where(eq(risks.fingerprint, fingerprint))
      .limit(1);

    return result ?? null;
  }

  async findBySeverity(severity: string): Promise<Risk[]> {
    return this.db
      .select()
      .from(risks)
      .where(eq(risks.severity, severity))
      .orderBy(risks.createdAt);
  }
}
