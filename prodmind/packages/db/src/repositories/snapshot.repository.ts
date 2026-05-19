import { eq, and, desc } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { snapshots } from '../schema/snapshots.ts';
import { projects } from '../schema/projects.ts';
import { generateId, now } from '../utils.ts';
import type { Snapshot } from '../schema/snapshots.ts';
import type { Result } from '@prodmind/contracts';
import { SnapshotStatus, canTransitionTo } from '@prodmind/contracts';

export class SnapshotRepository {
  constructor(private db: Database) {}

  async create(input: {
    projectId: string;
    uploadFilename?: string;
    uploadHash?: string;
  }): Promise<Snapshot> {
    const version = await this.getLatestVersion(input.projectId) + 1;

    const [snapshot] = await this.db
      .insert(snapshots)
      .values({
        id: generateId(),
        projectId: input.projectId,
        version,
        status: SnapshotStatus.PENDING,
        uploadFilename: input.uploadFilename ?? null,
        uploadHash: input.uploadHash ?? null,
        extractionPath: null,
        createdAt: now(),
        activatedAt: null,
        metadataJson: null,
        compressionRatio: null,
        confidenceScore: null,
        isDegraded: false,
      })
      .returning();

    return snapshot!;
  }

  async findById(id: string): Promise<Snapshot | null> {
    const [result] = await this.db
      .select()
      .from(snapshots)
      .where(eq(snapshots.id, id))
      .limit(1);

    return result ?? null;
  }

  async findByProjectId(projectId: string): Promise<Snapshot[]> {
    return this.db
      .select()
      .from(snapshots)
      .where(eq(snapshots.projectId, projectId))
      .orderBy(desc(snapshots.version));
  }

  async getActiveSnapshot(projectId: string): Promise<Snapshot | null> {
    const [result] = await this.db
      .select()
      .from(snapshots)
      .where(
        and(
          eq(snapshots.projectId, projectId),
          eq(snapshots.status, SnapshotStatus.ACTIVE),
        ),
      )
      .limit(1);

    return result ?? null;
  }

  async activateSnapshot(id: string): Promise<Snapshot> {
    return this.db.transaction(async (tx) => {
      const [snapshot] = await tx
        .update(snapshots)
        .set({
          status: SnapshotStatus.ACTIVE,
          activatedAt: now(),
        })
        .where(eq(snapshots.id, id))
        .returning();

      if (!snapshot) throw new Error(`Snapshot ${id} not found`);

      await tx
        .update(projects)
        .set({ activeSnapshotId: id, updatedAt: now() })
        .where(eq(projects.id, snapshot.projectId));

      return snapshot;
    });
  }

  async activateSnapshotWithValidation(
    id: string,
  ): Promise<Result<Snapshot, string>> {
    const snapshot = await this.findById(id);
    if (!snapshot) {
      return { success: false, error: `Snapshot ${id} not found` };
    }

    if (snapshot.status !== SnapshotStatus.ANALYZING) {
      return {
        success: false,
        error: `Snapshot ${id} is in state ${snapshot.status}, expected ANALYZING`,
      };
    }

    const activated = await this.activateSnapshot(id);
    return { success: true, data: activated };
  }

  async updateStatus(id: string, newStatus: SnapshotStatus): Promise<Snapshot> {
    const current = await this.findById(id);
    if (!current) throw new Error(`Snapshot ${id} not found`);

    const currentStatus = current.status as SnapshotStatus;
    if (!canTransitionTo(currentStatus, newStatus)) {
      throw new Error(
        `Cannot transition snapshot ${id} from ${currentStatus} to ${newStatus}`,
      );
    }

    const [snapshot] = await this.db
      .update(snapshots)
      .set({ status: newStatus })
      .where(eq(snapshots.id, id))
      .returning();

    return snapshot!;
  }

  async markFailed(id: string): Promise<Snapshot> {
    return this.updateStatus(id, SnapshotStatus.FAILED);
  }

  async markDegraded(id: string): Promise<Snapshot> {
    const [snapshot] = await this.db
      .update(snapshots)
      .set({
        status: SnapshotStatus.DEGRADED,
        isDegraded: true,
      })
      .where(eq(snapshots.id, id))
      .returning();

    return snapshot!;
  }

  async getLatestVersion(projectId: string): Promise<number> {
    const [result] = await this.db
      .select({ version: snapshots.version })
      .from(snapshots)
      .where(eq(snapshots.projectId, projectId))
      .orderBy(desc(snapshots.version))
      .limit(1);

    return result?.version ?? 0;
  }

  async updateMetadata(
    id: string,
    metadataJson: string | null,
  ): Promise<void> {
    await this.db
      .update(snapshots)
      .set({ metadataJson })
      .where(eq(snapshots.id, id));
  }
}
