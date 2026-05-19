import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Client } from '@libsql/client';
import type { Database } from '../../client.ts';
import * as fs from 'node:fs';
import { RetrievalRepository } from '../../repositories/retrieval.repository.ts';
import { GraphRepository } from '../../repositories/graph.repository.ts';
import { createFullTestDb, seedProject, seedSnapshot, seedNodes } from '../helpers.ts';
import { SnapshotStatus } from '@prodmind/contracts';

function cleanDb(path: string) {
  try { fs.unlinkSync(path); } catch { /* ignore */ }
  try { fs.unlinkSync(path + '-wal'); } catch { /* ignore */ }
  try { fs.unlinkSync(path + '-shm'); } catch { /* ignore */ }
}

describe('RetrievalRepository', () => {
  let client: Client;
  let db: Database;
  let snapshotId: string;
  let nodeIds: string[];
  let graphRepo: GraphRepository;
  let retrievalRepo: RetrievalRepository;
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
    retrievalRepo = new RetrievalRepository(db);

    const nodes = await seedNodes(client, snapshotId, 5);
    nodeIds = nodes.map((n) => n.id);

    await graphRepo.insertEdges(snapshotId, [
      { sourceNodeId: nodeIds[0]!, targetNodeId: nodeIds[1]!, edgeType: 'IMPORTS' },
      { sourceNodeId: nodeIds[1]!, targetNodeId: nodeIds[2]!, edgeType: 'IMPORTS' },
      { sourceNodeId: nodeIds[2]!, targetNodeId: nodeIds[3]!, edgeType: 'IMPORTS' },
      { sourceNodeId: nodeIds[3]!, targetNodeId: nodeIds[4]!, edgeType: 'IMPORTS' },
    ]);
  });

  afterAll(() => cleanDb(dbPath));

  it('getSnapshotGraph returns all nodes and edges', async () => {
    const graph = await retrievalRepo.getSnapshotGraph(snapshotId);
    expect(graph.nodes.length).toBe(5);
    expect(graph.edges.length).toBe(4);
  });

  it('getNodeNeighborhood traverses forward', async () => {
    const result = await retrievalRepo.getNodeNeighborhood(snapshotId, nodeIds[0]!, {
      maxDepth: 2,
      direction: 'forward',
    });
    expect(result.visitedIds.includes(nodeIds[1]!)).toBe(true);
    expect(result.visitedIds.includes(nodeIds[2]!)).toBe(true);
  });

  it('getNodeNeighborhood respects maxDepth', async () => {
    const result = await retrievalRepo.getNodeNeighborhood(snapshotId, nodeIds[0]!, {
      maxDepth: 1,
      direction: 'forward',
    });
    expect(result.visitedIds.includes(nodeIds[1]!)).toBe(true);
    expect(result.visitedIds.includes(nodeIds[2]!)).toBe(false);
  });

  it('getNamespaceOwnership returns namespaces', async () => {
    const namespaces = await retrievalRepo.getNamespaceOwnership(snapshotId);
    expect(namespaces.length).toBeGreaterThanOrEqual(1);
  });

  it('getSymbolOwnership returns symbol mappings', async () => {
    const symbols = await retrievalRepo.getSymbolOwnership(snapshotId);
    expect(Array.isArray(symbols)).toBe(true);
  });
});
