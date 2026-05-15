import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Client } from '@libsql/client';
import type { Database } from '../client.ts';
import * as fs from 'node:fs';
import { bfsTraversal } from '../graph/traversal.ts';
import { computeBlastRadius } from '../graph/blast-radius.ts';
import { getCircularDependencies, getDependencyGraph } from '../graph/dependency-query.ts';
import { GraphRepository } from '../repositories/graph.repository.ts';
import { createFullTestDb, seedProject, seedSnapshot, seedNodes } from './helpers.ts';
import { SnapshotStatus } from '@prodmind/contracts';

function cleanDb(path: string) {
  try { fs.unlinkSync(path); } catch { /* ignore */ }
  try { fs.unlinkSync(path + '-wal'); } catch { /* ignore */ }
  try { fs.unlinkSync(path + '-shm'); } catch { /* ignore */ }
}

describe('BFS Traversal', () => {
  let client: Client;
  let db: Database;
  let snapshotId: string;
  let nodeIds: string[];
  let graphRepo: GraphRepository;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    dbPath = env.dbPath;
    client = env.client;
    db = env.db;
    const project = await seedProject(client);
    const snap = await seedSnapshot(client, project.id, { status: SnapshotStatus.PARSING });
    snapshotId = snap.id;

    graphRepo = new GraphRepository(db);

    const nodes = await seedNodes(client, snapshotId, 4);
    nodeIds = nodes.map((n) => n.id);

    const insertResult = await graphRepo.insertEdges(snapshotId, [
      { sourceNodeId: nodeIds[0]!, targetNodeId: nodeIds[1]!, edgeType: 'IMPORTS' },
      { sourceNodeId: nodeIds[1]!, targetNodeId: nodeIds[2]!, edgeType: 'IMPORTS' },
      { sourceNodeId: nodeIds[2]!, targetNodeId: nodeIds[3]!, edgeType: 'IMPORTS' },
    ]);

    expect(insertResult.success).toBe(true);
  });

  afterAll(() => cleanDb(dbPath));

  it('traverses forward with depth 0 returning only start node', async () => {
    const result = await bfsTraversal(db, snapshotId, nodeIds[0]!, { maxDepth: 0 });
    expect(result.nodeCount).toBe(1);
    expect(result.levels).toHaveLength(1);
    expect(result.levels[0]!.depth).toBe(0);
  });

  it('traverses forward with depth 1 returning direct dependencies', async () => {
    const result = await bfsTraversal(db, snapshotId, nodeIds[0]!, { maxDepth: 1 });
    expect(result.visited.includes(nodeIds[1]!)).toBe(true);
    expect(result.visited.includes(nodeIds[2]!)).toBe(false);
  });

  it('traverses forward with depth 2 returning transitive dependencies', async () => {
    const result = await bfsTraversal(db, snapshotId, nodeIds[0]!, { maxDepth: 2 });
    expect(result.visited.includes(nodeIds[2]!)).toBe(true);
    expect(result.visited.includes(nodeIds[3]!)).toBe(false);
  });

  it('handles backward traversal', async () => {
    const result = await bfsTraversal(db, snapshotId, nodeIds[3]!, {
      maxDepth: 2,
      direction: 'backward',
    });
    expect(result.visited.includes(nodeIds[2]!)).toBe(true);
    expect(result.visited.includes(nodeIds[1]!)).toBe(true);
  });

  it('produces deterministic ordering', async () => {
    const result1 = await bfsTraversal(db, snapshotId, nodeIds[0]!, { maxDepth: 2 });
    const result2 = await bfsTraversal(db, snapshotId, nodeIds[0]!, { maxDepth: 2 });

    expect(result1.levels.map((l) => l.nodes.map((n) => n.id))).toEqual(
      result2.levels.map((l) => l.nodes.map((n) => n.id)),
    );
  });
});

describe('Blast Radius', () => {
  let client: Client;
  let db: Database;
  let snapshotId: string;
  let nodeIds: string[];
  let graphRepo: GraphRepository;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    dbPath = env.dbPath;
    client = env.client;
    db = env.db;
    const project = await seedProject(client);
    const snap = await seedSnapshot(client, project.id, { status: SnapshotStatus.PARSING });
    snapshotId = snap.id;

    graphRepo = new GraphRepository(db);

    const nodes = await seedNodes(client, snapshotId, 5);
    nodeIds = nodes.map((n) => n.id);

    await graphRepo.insertEdges(snapshotId, [
      { sourceNodeId: nodeIds[0]!, targetNodeId: nodeIds[1]!, edgeType: 'IMPORTS' },
      { sourceNodeId: nodeIds[1]!, targetNodeId: nodeIds[2]!, edgeType: 'IMPORTS' },
      { sourceNodeId: nodeIds[1]!, targetNodeId: nodeIds[3]!, edgeType: 'IMPORTS' },
      { sourceNodeId: nodeIds[2]!, targetNodeId: nodeIds[4]!, edgeType: 'IMPORTS' },
    ]);
  });

  afterAll(() => cleanDb(dbPath));

  it('computes blast radius for a central node', async () => {
    const result = await computeBlastRadius(db, snapshotId, nodeIds[1]!, { maxDepth: 3 });
    expect(result.entryPoint.id).toBe(nodeIds[1]!);
    expect(result.totalAffected).toBeGreaterThanOrEqual(3);
  });

  it('separates direct and indirect impacts', async () => {
    const result = await computeBlastRadius(db, snapshotId, nodeIds[1]!, { maxDepth: 3 });
    expect(result.directImpacts.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Circular Dependencies', () => {
  let client: Client;
  let db: Database;
  let snapshotId: string;
  let nodeIds: string[];
  let graphRepo: GraphRepository;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    dbPath = env.dbPath;
    client = env.client;
    db = env.db;
    const project = await seedProject(client);
    const snap = await seedSnapshot(client, project.id, { status: SnapshotStatus.PARSING });
    snapshotId = snap.id;

    graphRepo = new GraphRepository(db);

    const nodes = await seedNodes(client, snapshotId, 3);
    nodeIds = nodes.map((n) => n.id);

    await graphRepo.insertEdges(snapshotId, [
      { sourceNodeId: nodeIds[0]!, targetNodeId: nodeIds[1]!, edgeType: 'IMPORTS' },
      { sourceNodeId: nodeIds[1]!, targetNodeId: nodeIds[2]!, edgeType: 'IMPORTS' },
      { sourceNodeId: nodeIds[2]!, targetNodeId: nodeIds[0]!, edgeType: 'IMPORTS' },
    ]);
  });

  afterAll(() => cleanDb(dbPath));

  it('detects circular dependencies', async () => {
    const cycles = await getCircularDependencies(db, snapshotId);
    expect(cycles.length).toBeGreaterThanOrEqual(1);

    const cycle = cycles[0]!;
    expect(cycle.cycle.length).toBe(3);
    expect(cycle.cycle.sort()).toEqual([...nodeIds].sort());
  });
});

describe('getDependencyGraph', () => {
  let client: Client;
  let db: Database;
  let snapshotId: string;
  let dbPath: string;

  beforeAll(async () => {
    const env = await createFullTestDb();
    dbPath = env.dbPath;
    client = env.client;
    db = env.db;
    const project = await seedProject(client);
    const snap = await seedSnapshot(client, project.id, { status: SnapshotStatus.PARSING });
    snapshotId = snap.id;
    const nodes = await seedNodes(client, snapshotId, 2);
    const graphRepo = new GraphRepository(db);
    await graphRepo.insertEdges(snapshotId, [
      { sourceNodeId: nodes[0]!.id, targetNodeId: nodes[1]!.id, edgeType: 'IMPORTS' },
    ]);
  });

  afterAll(() => cleanDb(dbPath));

  it('returns full graph for a snapshot', async () => {
    const graph = await getDependencyGraph(db, snapshotId);
    expect(graph.nodes.length).toBe(2);
    expect(graph.edges.length).toBe(1);
  });
});
