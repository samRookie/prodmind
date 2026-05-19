import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import { createTestDb, createTables, seedProject, seedSnapshot, seedNodes } from '../helpers.ts';
import type { Database } from '../../client.ts';
import { SemanticRepository } from '../../repositories/semantic.repository.ts';
import { CouplingRepository } from '../../repositories/coupling.repository.ts';
import { DomainRepository } from '../../repositories/domain.repository.ts';
import type { Result } from '@prodmind/contracts';

function cleanDb(path: string) {
  try { fs.unlinkSync(path); } catch { /* ignore */ }
  try { fs.unlinkSync(path + '-wal'); } catch { /* ignore */ }
  try { fs.unlinkSync(path + '-shm'); } catch { /* ignore */ }
}

describe('SemanticRepository', () => {
  let db: Database;
  let repo: SemanticRepository;
  let dbPath: string;
  let client: Awaited<ReturnType<typeof createTestDb>>['client'];
  let projectId: string;
  let snapshotId: string;
  let nodeId: string;

  beforeAll(async () => {
    const env = await createTestDb();
    dbPath = env.dbPath;
    client = env.client;
    db = env.db;
    await createTables(client);
    repo = new SemanticRepository(db);

    const proj = await seedProject(client);
    projectId = proj.id;
    const snap = await seedSnapshot(client, projectId);
    snapshotId = snap.id;
    const nodes = await seedNodes(client, snapshotId, 1);
    nodeId = nodes[0]!.id;
  });

  afterAll(() => cleanDb(dbPath));

  it('inserts and retrieves classifications', async () => {
    const result: Result<Array<Record<string, unknown>>, string> = await repo.insertClassifications(snapshotId, [
      {
        nodeId,
        semanticType: 'API_LAYER',
        ruleStrength: 'HIGH',
        classificationReasonsJson: JSON.stringify(['api-routes']),
        matchedHeuristicsJson: JSON.stringify([{ ruleName: 'api-routes', pattern: '/routes/', matched: true }]),
        infraScore: 0.8,
        businessScore: 0.2,
        dominantRole: 'infrastructure',
      },
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.semanticType).toBe('API_LAYER');

    const retrieved = await repo.getClassificationsBySnapshot(snapshotId);
    expect(retrieved.length).toBe(1);
    expect(retrieved[0]!.snapshotId).toBe(snapshotId);
  });

  it('returns empty array for snapshot with no classifications', async () => {
    const retrieved = await repo.getClassificationsBySnapshot('nonexistent');
    expect(retrieved).toEqual([]);
  });
});

describe('CouplingRepository', () => {
  let db: Database;
  let repo: CouplingRepository;
  let dbPath: string;
  let client: Awaited<ReturnType<typeof createTestDb>>['client'];
  let projectId: string;
  let snapshotId: string;
  let nodes: { id: string }[];

  beforeAll(async () => {
    const env = await createTestDb();
    dbPath = env.dbPath;
    client = env.client;
    db = env.db;
    await createTables(client);
    repo = new CouplingRepository(db);

    const proj = await seedProject(client);
    projectId = proj.id;
    const snap = await seedSnapshot(client, projectId);
    snapshotId = snap.id;
    nodes = await seedNodes(client, snapshotId, 2);
  });

  afterAll(() => cleanDb(dbPath));

  it('inserts and retrieves coupling edges', async () => {
    const result: Result<Array<Record<string, unknown>>, string> = await repo.insertCouplingEdges(snapshotId, [
      {
        sourceNodeId: nodes[0]!.id,
        targetNodeId: nodes[1]!.id,
        couplingType: 'LOOSE_COUPLING',
        couplingStrength: 0.3,
        propagationRisk: 0.1,
        metadataJson: null,
      },
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(1);

    const retrieved = await repo.getCouplingEdgesBySnapshot(snapshotId);
    expect(retrieved.length).toBe(1);
    expect(retrieved[0]!.couplingType).toBe('LOOSE_COUPLING');
  });
});

describe('DomainRepository', () => {
  let db: Database;
  let repo: DomainRepository;
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
    repo = new DomainRepository(db);

    const proj = await seedProject(client);
    projectId = proj.id;
    const snap = await seedSnapshot(client, projectId);
    snapshotId = snap.id;
  });

  afterAll(() => cleanDb(dbPath));

  it('inserts and retrieves domain clusters', async () => {
    const result: Result<Array<Record<string, unknown>>, string> = await repo.insertDomainClusters(snapshotId, [
      {
        clusterName: 'services',
        nodeIdsJson: JSON.stringify(['n1', 'n2']),
        cohesionScore: 0.8,
        fragmentationScore: 0.1,
        boundaryMetadataJson: JSON.stringify({ regionCount: 1, regions: [] }),
      },
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.clusterName).toBe('services');

    const retrieved = await repo.getClustersBySnapshot(snapshotId);
    expect(retrieved.length).toBe(1);
    expect(retrieved[0]!.cohesionScore).toBe(0.8);
  });

  it('finds cluster by name', async () => {
    const found = await repo.getClusterByName('services', snapshotId);
    expect(found).not.toBeNull();
    expect(found!.clusterName).toBe('services');
  });
});
