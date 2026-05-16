import type { Database } from '@prodmind/db';
import { SnapshotRepository, EventRepository } from '@prodmind/db';
import type { Snapshot } from '@prodmind/db';
import type { NewNode, NewEdge } from '@prodmind/db';
import { GraphRepository } from '@prodmind/db';
import { SnapshotStatus } from '@prodmind/contracts';
import type { Result } from '@prodmind/contracts';

export class SnapshotPipeline {
  private readonly snapshots: SnapshotRepository;
  private readonly graph: GraphRepository;
  private readonly events: EventRepository;

  public constructor(db: Database) {
    this.snapshots = new SnapshotRepository(db);
    this.graph = new GraphRepository(db);
    this.events = new EventRepository(db);
  }

  public async createSnapshot(
    projectId: string,
    uploadFilename?: string,
    uploadHash?: string,
  ): Promise<Snapshot> {
    return this.snapshots.create({ projectId, uploadFilename, uploadHash });
  }

  public async transitionTo(snapshotId: string, targetStatus: SnapshotStatus): Promise<Snapshot> {
    return this.snapshots.updateStatus(snapshotId, targetStatus);
  }

  public async markFailed(snapshotId: string, error: string): Promise<Snapshot> {
    await this.events.log('ingestion_failed', { snapshotId, error });
    return this.snapshots.markFailed(snapshotId);
  }

  public async markDegraded(snapshotId: string): Promise<Snapshot> {
    return this.snapshots.markDegraded(snapshotId);
  }

  public async commitGraph(
    snapshotId: string,
    nodeInputs: Omit<NewNode, 'id' | 'snapshotId' | 'createdAt'>[],
    edgeInputs: Omit<NewEdge, 'id' | 'snapshotId' | 'createdAt'>[],
  ): Promise<Result<void, string>> {
    const nodeResult = await this.graph.insertNodes(snapshotId, nodeInputs);
    if (!nodeResult.success) {
      return nodeResult;
    }

    const edgeResult = await this.graph.insertEdges(snapshotId, edgeInputs);
    if (!edgeResult.success) {
      return edgeResult;
    }

    return { success: true, data: undefined };
  }

  public async activateSnapshot(snapshotId: string): Promise<Result<Snapshot, string>> {
    const result = await this.snapshots.activateSnapshotWithValidation(snapshotId);
    if (result.success) {
      await this.events.log('snapshot_activated', { snapshotId });
    }
    return result;
  }

  public async rollbackSnapshot(snapshotId: string): Promise<Snapshot> {
    const snapshot = await this.snapshots.findById(snapshotId);
    if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found for rollback`);

    const failed = await this.snapshots.markFailed(snapshotId);
    await this.events.log('snapshot_rollback', {
      snapshotId,
      projectId: snapshot.projectId,
      previousStatus: snapshot.status,
    });
    return failed;
  }

  public findById(id: string): Promise<Snapshot | null> {
    return this.snapshots.findById(id);
  }
}
