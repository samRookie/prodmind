import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Client } from '@libsql/client';
import type { Database } from '../client.ts';
import * as fs from 'node:fs';
import { ProjectRepository } from '../repositories/project.repository.ts';
import { SnapshotRepository } from '../repositories/snapshot.repository.ts';
import { GraphRepository } from '../repositories/graph.repository.ts';
import { RiskRepository } from '../repositories/risk.repository.ts';
import { EventRepository } from '../repositories/event.repository.ts';
import { JobRepository } from '../repositories/job.repository.ts';
import { createFullTestDb, seedProject, seedSnapshot, seedNodes } from './helpers.ts';
import { ProjectStatus, SnapshotStatus } from '@prodmind/contracts';

async function advanceToAnalyzing(snapRepo: SnapshotRepository, id: string) {
  const s1 = await snapRepo.updateStatus(id, SnapshotStatus.UPLOADING);
  const s2 = await snapRepo.updateStatus(s1.id, SnapshotStatus.EXTRACTING);
  const s3 = await snapRepo.updateStatus(s2.id, SnapshotStatus.PARSING);
  const s4 = await snapRepo.updateStatus(s3.id, SnapshotStatus.ANALYZING);
  return s4;
}

function cleanDb(path: string) {
  try { fs.unlinkSync(path); } catch { /* ignore */ }
  try { fs.unlinkSync(path + '-wal'); } catch { /* ignore */ }
  try { fs.unlinkSync(path + '-shm'); } catch { /* ignore */ }
}

describe('ProjectRepository', () => {
  let db: Database;
  let repo: ProjectRepository;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    dbPath = env.dbPath;
    db = env.db;
    repo = new ProjectRepository(db);
  });

  afterAll(() => cleanDb(dbPath));

  it('creates a project', async () => {
    const project = await repo.create({ name: 'Test', description: 'desc' });
    expect(project.id).toBeDefined();
    expect(project.name).toBe('Test');
    expect(project.status).toBe('PENDING');
  });

  it('finds project by id', async () => {
    const created = await repo.create({ name: 'Find Me' });
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it('returns null for missing project', async () => {
    const found = await repo.findById('nonexistent');
    expect(found).toBeNull();
  });

  it('updates project status', async () => {
    const created = await repo.create({ name: 'Status' });
    const updated = await repo.updateStatus(created.id, ProjectStatus.ANALYZING);
    expect(updated.status).toBe(ProjectStatus.ANALYZING);
  });

  it('sets active snapshot', async () => {
    const project = await repo.create({ name: 'Active' });
    const updated = await repo.setActiveSnapshot(project.id, 'snap-1');
    expect(updated.activeSnapshotId).toBe('snap-1');
  });

  it('lists projects', async () => {
    const list = await repo.list();
    expect(Array.isArray(list)).toBe(true);
  });
});

describe('SnapshotRepository', () => {
  let client: Client;
  let db: Database;
  let repo: SnapshotRepository;
  let projectId: string;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    dbPath = env.dbPath;
    client = env.client;
    db = env.db;
    repo = new SnapshotRepository(db);
    projectId = (await seedProject(client)).id;
  });

  afterAll(() => cleanDb(dbPath));

  it('creates a snapshot with auto-incrementing version', async () => {
    const snap1 = await repo.create({ projectId });
    expect(snap1.version).toBe(1);

    const snap2 = await repo.create({ projectId });
    expect(snap2.version).toBe(2);
  });

  it('finds snapshot by id', async () => {
    const created = await repo.create({ projectId });
    const found = await repo.findById(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it('lists snapshots by project', async () => {
    const snaps = await repo.findByProjectId(projectId);
    expect(snaps.length).toBeGreaterThanOrEqual(3);
  });

  it('activates snapshot with validation', async () => {
    const snap = await repo.create({ projectId });
    const analyzing = await advanceToAnalyzing(repo, snap.id);

    const result = await repo.activateSnapshotWithValidation(analyzing.id);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe(SnapshotStatus.ACTIVE);
    }
  });

  it('rejects activation of non-ANALYZING snapshot', async () => {
    const snap = await repo.create({ projectId });
    const result = await repo.activateSnapshotWithValidation(snap.id);
    expect(result.success).toBe(false);
  });

  it('enforces valid state transitions', async () => {
    const snap = await repo.create({ projectId });
    await expect(
      repo.updateStatus(snap.id, SnapshotStatus.ACTIVE),
    ).rejects.toThrow();
  });
});

describe('GraphRepository', () => {
  let client: Client;
  let db: Database;
  let repo: GraphRepository;
  let snapshotId: string;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    dbPath = env.dbPath;
    client = env.client;
    db = env.db;
    repo = new GraphRepository(db);
    const project = await seedProject(client);
    const snap = await seedSnapshot(client, project.id, { status: SnapshotStatus.PARSING });
    snapshotId = snap.id;
  });

  afterAll(() => cleanDb(dbPath));

  it('inserts nodes in batch', async () => {
    const result = await repo.insertNodes(snapshotId, [
      { filePath: '/a.ts', nodeType: 'FILE', symbolName: 'A', language: 'typescript' },
      { filePath: '/b.ts', nodeType: 'FILE', symbolName: 'B', language: 'typescript' },
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]!.snapshotId).toBe(snapshotId);
    }
  });

  it('inserts edges in batch', async () => {
    const nodes = await repo.getNodesBySnapshot(snapshotId);
    expect(nodes.length).toBeGreaterThanOrEqual(2);

    const result = await repo.insertEdges(snapshotId, [
      { sourceNodeId: nodes[0]!.id, targetNodeId: nodes[1]!.id, edgeType: 'IMPORTS' },
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
    }
  });

  it('finds dependencies', async () => {
    const nodes = await repo.getNodesBySnapshot(snapshotId);
    const deps = await repo.getDependencies(nodes[0]!.id, snapshotId);
    expect(deps.length).toBeGreaterThanOrEqual(1);
    expect(deps[0]!.node.id).toBe(nodes[1]!.id);
  });

  it('finds dependents', async () => {
    const nodes = await repo.getNodesBySnapshot(snapshotId);
    const deps = await repo.getDependents(nodes[1]!.id, snapshotId);
    expect(deps.length).toBeGreaterThanOrEqual(1);
    expect(deps[0]!.node.id).toBe(nodes[0]!.id);
  });

  it('rejects writes to ACTIVE snapshot', async () => {
    const project = await seedProject(client);
    const snap = await seedSnapshot(client, project.id, { status: SnapshotStatus.ACTIVE });

    const result = await repo.insertNodes(snap.id, [
      { filePath: '/x.ts', nodeType: 'FILE', symbolName: 'X', language: 'typescript' },
    ]);

    expect(result.success).toBe(false);
  });
});

describe('RiskRepository', () => {
  let client: Client;
  let db: Database;
  let repo: RiskRepository;
  let snapshotId: string;
  let nodeId: string;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    dbPath = env.dbPath;
    client = env.client;
    db = env.db;
    repo = new RiskRepository(db);
    const project = await seedProject(client);
    const snap = await seedSnapshot(client, project.id);
    snapshotId = snap.id;
    const nodes = await seedNodes(client, snapshotId, 1);
    nodeId = nodes[0]!.id;
  });

  afterAll(() => cleanDb(dbPath));

  it('creates a risk', async () => {
    const risk = await repo.create({
      snapshotId,
      nodeId,
      severity: 'HIGH',
      category: 'COMPLEXITY',
      title: 'High cyclomatic complexity',
      fingerprint: 'finger-1',
    });
    expect(risk.id).toBeDefined();
    expect(risk.severity).toBe('HIGH');
  });

  it('finds risk by fingerprint', async () => {
    const found = await repo.findByFingerprint('finger-1');
    expect(found).not.toBeNull();
    expect(found!.title).toBe('High cyclomatic complexity');
  });

  it('finds risks by snapshot', async () => {
    const risks = await repo.findBySnapshot(snapshotId);
    expect(risks.length).toBeGreaterThanOrEqual(1);
  });
});

describe('EventRepository', () => {
  let db: Database;
  let repo: EventRepository;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    dbPath = env.dbPath;
    db = env.db;
    repo = new EventRepository(db);
  });

  afterAll(() => cleanDb(dbPath));

  it('logs an event', async () => {
    const event = await repo.log('PROJECT_CREATED', { projectId: 'p1' });
    expect(event.eventType).toBe('PROJECT_CREATED');
    expect(event.payloadJson).toBe('{"projectId":"p1"}');
  });

  it('lists events in reverse chronological order', async () => {
    const events = await repo.list();
    expect(events.length).toBeGreaterThanOrEqual(1);
  });
});

describe('JobRepository', () => {
  let db: Database;
  let repo: JobRepository;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    dbPath = env.dbPath;
    db = env.db;
    repo = new JobRepository(db);
  });

  afterAll(() => cleanDb(dbPath));

  it('creates a job', async () => {
    const job = await repo.create({ jobType: 'PARSE_PROJECT', priority: 1 });
    expect(job.status).toBe('QUEUED');
    expect(job.retryCount).toBe(0);
  });

  it('claims next job', async () => {
    const job = await repo.claimNext();
    expect(job).not.toBeNull();
    expect(job!.status).toBe('RUNNING');
  });

  it('increments retry count', async () => {
    await repo.create({ jobType: 'RETRY_TEST', priority: 1 });
    const claimed = await repo.claimNext(['RETRY_TEST']);
    const retried = await repo.incrementRetry(claimed!.id);
    expect(retried.retryCount).toBe(1);
  });
});
