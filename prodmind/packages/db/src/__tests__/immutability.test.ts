import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Client } from '@libsql/client';
import type { Database } from '../client.ts';
import * as fs from 'node:fs';
import { GraphRepository } from '../repositories/graph.repository.ts';
import { SnapshotRepository } from '../repositories/snapshot.repository.ts';
import { createFullTestDb, seedProject } from './helpers.ts';
import { SnapshotStatus } from '@prodmind/contracts';

async function advanceToAnalyzing(snapRepo: SnapshotRepository, id: string) {
  const s1 = await snapRepo.updateStatus(id, SnapshotStatus.UPLOADING);
  const s2 = await snapRepo.updateStatus(s1.id, SnapshotStatus.EXTRACTING);
  const s3 = await snapRepo.updateStatus(s2.id, SnapshotStatus.PARSING);
  const s4 = await snapRepo.updateStatus(s3.id, SnapshotStatus.ANALYZING);
  return s4;
}

describe('Snapshot Immutability', () => {
  let client: Client;
  let db: Database;
  let graphRepo: GraphRepository;
  let snapRepo: SnapshotRepository;
  let projectId: string;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    client = env.client;
    db = env.db;
    dbPath = env.dbPath;
    graphRepo = new GraphRepository(db);
    snapRepo = new SnapshotRepository(db);
    projectId = (await seedProject(client)).id;
  });

  afterAll(() => {
    try { fs.unlinkSync(dbPath); } catch {}
    try { fs.unlinkSync(dbPath + '-wal'); } catch {}
    try { fs.unlinkSync(dbPath + '-shm'); } catch {}
  });

  async function makeAnalyzing() {
    const snap = await snapRepo.create({ projectId });
    return advanceToAnalyzing(snapRepo, snap.id);
  }

  it('ACTIVE snapshot rejects node insertion', async () => {
    const analyzing = await makeAnalyzing();
    await snapRepo.activateSnapshot(analyzing.id);

    const result = await graphRepo.insertNodes(analyzing.id, [
      { filePath: '/new.ts', nodeType: 'FILE', symbolName: 'New', language: 'typescript' },
    ]);

    expect(result.success).toBe(false);
  });

  it('ACTIVE snapshot rejects edge insertion', async () => {
    const analyzing = await makeAnalyzing();
    await snapRepo.activateSnapshot(analyzing.id);

    const result = await graphRepo.insertEdges(analyzing.id, [
      { sourceNodeId: 'nonexistent', targetNodeId: 'nonexistent2', edgeType: 'IMPORTS' },
    ]);

    expect(result.success).toBe(false);
  });

  it('ACTIVE snapshot status cannot transition', async () => {
    const analyzing = await makeAnalyzing();
    await snapRepo.activateSnapshot(analyzing.id);

    await expect(
      snapRepo.updateStatus(analyzing.id, SnapshotStatus.FAILED),
    ).rejects.toThrow();
  });

  it('historical snapshot data remains readable after activation', async () => {
    const analyzing = await makeAnalyzing();
    await snapRepo.activateSnapshot(analyzing.id);

    const found = await snapRepo.findById(analyzing.id);
    expect(found).not.toBeNull();
    expect(found!.status).toBe(SnapshotStatus.ACTIVE);
    expect(found!.activatedAt).not.toBeNull();
  });

  it('multiple snapshots can exist for same project with different statuses', async () => {
    const p = await seedProject(client);
    const snap1 = await snapRepo.create({ projectId: p.id });
    const snap2 = await snapRepo.create({ projectId: p.id });

    expect(snap1.version).toBe(1);
    expect(snap2.version).toBe(2);

    const snaps = await snapRepo.findByProjectId(p.id);
    expect(snaps.length).toBeGreaterThanOrEqual(2);
  });
});
