import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import { createTestDb, createTables, seedProject, seedSnapshot } from '../helpers.ts';
import type { Database } from '../../client.ts';
import { MetricsRepository } from '../../repositories/metrics.repository.ts';
import type { Result } from '@prodmind/contracts';

function cleanDb(path: string) {
  try { fs.unlinkSync(path); } catch { /* ignore */ }
  try { fs.unlinkSync(path + '-wal'); } catch { /* ignore */ }
  try { fs.unlinkSync(path + '-shm'); } catch { /* ignore */ }
}

describe('MetricsRepository', () => {
  let db: Database;
  let repo: MetricsRepository;
  let dbPath: string;
  let client: Awaited<ReturnType<typeof createTestDb>>['client'];
  let projectId: string;
  let snapshotId: string;

  beforeAll(async () => {
    const env = await createTestDb();
    dbPath = env.dbPath;
    client = env.client;
    db = env.db;
    await createTables(client);
    repo = new MetricsRepository(db);

    const proj = await seedProject(client);
    projectId = proj.id;
    const snap = await seedSnapshot(client, projectId);
    snapshotId = snap.id;
  });

  afterAll(() => cleanDb(dbPath));

  it('inserts and retrieves graph metrics', async () => {
    const result: Result<Array<Record<string, unknown>>, string> = await repo.insertMetrics(snapshotId, [
      {
        metricType: 'CENTRALITY',
        metricScope: 'NODE',
        nodeId: 'n1',
        metricValue: 0.85,
        metricClassification: null,
        metricPriority: 'IMPORTANT',
        metadataJson: JSON.stringify({ inDegree: 5, outDegree: 3 }),
      },
      {
        metricType: 'COMPLEXITY',
        metricScope: 'GLOBAL',
        nodeId: null,
        metricValue: 0.45,
        metricClassification: 'MODERATE',
        metricPriority: 'CRITICAL',
        metadataJson: JSON.stringify({ densityScore: 0.3, entropyScore: 0.5 }),
      },
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(2);

    const retrieved = await repo.getMetricsBySnapshot(snapshotId);
    expect(retrieved.length).toBe(2);
    expect(retrieved.every((r) => r.snapshotId === snapshotId)).toBe(true);
  });

  it('filters out LOW priority metrics on insert', async () => {
    const result = await repo.insertMetrics(snapshotId, [
      {
        metricType: 'FAN_ANALYSIS',
        metricScope: 'NODE',
        nodeId: 'n2',
        metricValue: 0,
        metricClassification: 'LOW',
        metricPriority: 'LOW',
        metadataJson: null,
      },
    ]);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(0);
  });

  it('retrieves metrics by type', async () => {
    const retrieved = await repo.getMetricsByType('COMPLEXITY', snapshotId);
    expect(retrieved.length).toBe(1);
    expect(retrieved[0]!.metricType).toBe('COMPLEXITY');
  });

  it('retrieves metrics by node', async () => {
    const retrieved = await repo.getMetricsByNode('n1', snapshotId);
    expect(retrieved.length).toBe(1);
    expect(retrieved[0]!.nodeId).toBe('n1');
  });

  it('deletes metrics by snapshot', async () => {
    const deleteResult = await repo.deleteMetricsBySnapshot(snapshotId);
    expect(deleteResult.success).toBe(true);

    const retrieved = await repo.getMetricsBySnapshot(snapshotId);
    expect(retrieved).toEqual([]);
  });
});
