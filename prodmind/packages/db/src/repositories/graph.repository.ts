import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { nodes } from '../schema/nodes.ts';
import { edges } from '../schema/edges.ts';
import { snapshots } from '../schema/snapshots.ts';
import { generateId, now } from '../utils.ts';
import type { Node, NewNode } from '../schema/nodes.ts';
import type { Edge, NewEdge } from '../schema/edges.ts';
import { SnapshotStatus } from '@prodmind/contracts';
import type { Result } from '@prodmind/contracts';

interface NodeWithEdge {
  node: Node;
  edge: Edge;
}

export class GraphRepository {
  constructor(private db: Database) {}

  private async assertSnapshotMutable(snapshotId: string): Promise<Result<void, string>> {
    const [snap] = await this.db
      .select({ status: snapshots.status })
      .from(snapshots)
      .where(eq(snapshots.id, snapshotId))
      .limit(1);

    if (!snap) {
      return { success: false, error: `Snapshot ${snapshotId} not found` };
    }

    if (snap.status === SnapshotStatus.ACTIVE || snap.status === SnapshotStatus.FAILED) {
      return { success: false, error: `Cannot modify ${snap.status} snapshot ${snapshotId}` };
    }

    return { success: true, data: undefined };
  }

  async insertNodes(
    snapshotId: string,
    inputs: (Omit<NewNode, 'id' | 'snapshotId' | 'createdAt'> & { id?: string })[],
  ): Promise<Result<Node[], string>> {
    const check = await this.assertSnapshotMutable(snapshotId);
    if (!check.success) return check;

    try {
      const result = await this.db.transaction(async (tx) => {
        const inserted: Node[] = [];
        const batchSize = 100;
        for (let i = 0; i < inputs.length; i += batchSize) {
          const batch = inputs.slice(i, i + batchSize);
          const values = batch.map((input) => ({
            id: input.id ?? generateId(),
            snapshotId,
            filePath: input.filePath,
            fileHash: input.fileHash ?? null,
            nodeType: input.nodeType,
            symbolName: input.symbolName ?? null,
            language: input.language ?? null,
            metadataJson: input.metadataJson ?? null,
            summaryJson: input.summaryJson ?? null,
            createdAt: now(),
          }));
          const rows = await tx.insert(nodes).values(values).returning();
          inserted.push(...rows);
        }
        return inserted;
      });

      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Node insertion failed',
      };
    }
  }

  async insertEdges(
    snapshotId: string,
    inputs: (Omit<NewEdge, 'id' | 'snapshotId' | 'createdAt'> & { id?: string })[],
  ): Promise<Result<Edge[], string>> {
    const check = await this.assertSnapshotMutable(snapshotId);
    if (!check.success) return check;

    try {
      const result = await this.db.transaction(async (tx) => {
        const inserted: Edge[] = [];
        const batchSize = 100;
        for (let i = 0; i < inputs.length; i += batchSize) {
          const batch = inputs.slice(i, i + batchSize);
          const values = batch.map((input) => ({
            id: input.id ?? generateId(),
            snapshotId,
            sourceNodeId: input.sourceNodeId,
            targetNodeId: input.targetNodeId,
            edgeType: input.edgeType,
            weight: input.weight ?? null,
            metadataJson: input.metadataJson ?? null,
            createdAt: now(),
          }));
          const rows = await tx.insert(edges).values(values).returning();
          inserted.push(...rows);
        }
        return inserted;
      });

      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Edge insertion failed',
      };
    }
  }

  async getNodeById(id: string): Promise<Node | null> {
    const [result] = await this.db
      .select()
      .from(nodes)
      .where(eq(nodes.id, id))
      .limit(1);

    return result ?? null;
  }

  async getEdgeById(id: string): Promise<Edge | null> {
    const [result] = await this.db
      .select()
      .from(edges)
      .where(eq(edges.id, id))
      .limit(1);

    return result ?? null;
  }

  async getNodesBySnapshot(snapshotId: string): Promise<Node[]> {
    return this.db
      .select()
      .from(nodes)
      .where(eq(nodes.snapshotId, snapshotId))
      .orderBy(nodes.id);
  }

  async getEdgesBySnapshot(snapshotId: string): Promise<Edge[]> {
    return this.db
      .select()
      .from(edges)
      .where(eq(edges.snapshotId, snapshotId))
      .orderBy(edges.id);
  }

  async getDependencies(
    nodeId: string,
    snapshotId: string,
  ): Promise<NodeWithEdge[]> {
    const result = await this.db
      .select()
      .from(edges)
      .innerJoin(nodes, eq(edges.targetNodeId, nodes.id))
      .where(
        and(
          eq(edges.sourceNodeId, nodeId),
          eq(edges.snapshotId, snapshotId),
        ),
      )
      .orderBy(edges.id);

    return result.map((r) => ({ node: r.nodes, edge: r.edges }));
  }

  async getDependents(
    nodeId: string,
    snapshotId: string,
  ): Promise<NodeWithEdge[]> {
    const result = await this.db
      .select()
      .from(edges)
      .innerJoin(nodes, eq(edges.sourceNodeId, nodes.id))
      .where(
        and(
          eq(edges.targetNodeId, nodeId),
          eq(edges.snapshotId, snapshotId),
        ),
      )
      .orderBy(edges.id);

    return result.map((r) => ({ node: r.nodes, edge: r.edges }));
  }

  async getSnapshotGraph(snapshotId: string): Promise<{
    nodes: Node[];
    edges: Edge[];
  }> {
    const [nodeList, edgeList] = await Promise.all([
      this.getNodesBySnapshot(snapshotId),
      this.getEdgesBySnapshot(snapshotId),
    ]);

    return { nodes: nodeList, edges: edgeList };
  }

  async insertNodesAndEdges(
    snapshotId: string,
    nodeInputs: (Omit<NewNode, 'id' | 'snapshotId' | 'createdAt'> & { id?: string })[],
    edgeInputs: (Omit<NewEdge, 'id' | 'snapshotId' | 'createdAt'> & { id?: string })[],
  ): Promise<Result<{ nodes: Node[]; edges: Edge[] }, string>> {
    const check = await this.assertSnapshotMutable(snapshotId);
    if (!check.success) return check;

    try {
      const result = await this.db.transaction(async (tx) => {
        const insertedNodes: Node[] = [];
        const batchSize = 100;
        for (let i = 0; i < nodeInputs.length; i += batchSize) {
          const batch = nodeInputs.slice(i, i + batchSize);
          const values = batch.map((input) => ({
            id: input.id ?? generateId(),
            snapshotId,
            filePath: input.filePath,
            fileHash: input.fileHash ?? null,
            nodeType: input.nodeType,
            symbolName: input.symbolName ?? null,
            language: input.language ?? null,
            metadataJson: input.metadataJson ?? null,
            summaryJson: input.summaryJson ?? null,
            createdAt: now(),
          }));
          const rows = await tx.insert(nodes).values(values).returning();
          insertedNodes.push(...rows);
        }
        const insertedEdges: Edge[] = [];
        for (let i = 0; i < edgeInputs.length; i += batchSize) {
          const batch = edgeInputs.slice(i, i + batchSize);
          const values = batch.map((input) => ({
            id: input.id ?? generateId(),
            snapshotId,
            sourceNodeId: input.sourceNodeId,
            targetNodeId: input.targetNodeId,
            edgeType: input.edgeType,
            weight: input.weight ?? null,
            metadataJson: input.metadataJson ?? null,
            createdAt: now(),
          }));
          const rows = await tx.insert(edges).values(values).returning();
          insertedEdges.push(...rows);
        }
        return { nodes: insertedNodes, edges: insertedEdges };
      });
      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Node/edge insertion failed',
      };
    }
  }

  async deleteNodesBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    const check = await this.assertSnapshotMutable(snapshotId);
    if (!check.success) return check;

    try {
      await this.db.transaction(async (tx) => {
        await tx.delete(edges).where(eq(edges.snapshotId, snapshotId));
        await tx.delete(nodes).where(eq(nodes.snapshotId, snapshotId));
      });
      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Deletion failed',
      };
    }
  }

  async deleteEdgesBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    const check = await this.assertSnapshotMutable(snapshotId);
    if (!check.success) return check;

    try {
      await this.db.delete(edges).where(eq(edges.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Deletion failed',
      };
    }
  }

  async graphSize(snapshotId: string): Promise<{ nodeCount: number; edgeCount: number }> {
    const [nodeResult, edgeResult] = await Promise.all([
      this.db
        .select({ count: nodes.id })
        .from(nodes)
        .where(eq(nodes.snapshotId, snapshotId)),
      this.db
        .select({ count: edges.id })
        .from(edges)
        .where(eq(edges.snapshotId, snapshotId)),
    ]);

    return {
      nodeCount: nodeResult.length,
      edgeCount: edgeResult.length,
    };
  }
}
