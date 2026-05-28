import type { TraversalResult, TraversalStep, NodeId } from '../types/index.ts';
import { SerializationError } from '../errors/index.ts';

export class TraversalSerializer {
  public serialize(traversal: TraversalResult): string {
    try {
      const obj = {
        id: traversal.id,
        strategy: traversal.strategy,
        steps: traversal.steps.map((s) => ({
          nodeId: s.nodeId,
          depth: s.depth,
          parentId: s.parentId,
          edgeId: s.edgeId,
          metadata: s.metadata,
        })),
        visited: [...traversal.visited],
        depth: traversal.depth,
        nodeCount: traversal.nodeCount,
        startNode: traversal.startNode,
        endNode: traversal.endNode,
        duration: traversal.duration,
        status: traversal.status,
        fingerprint: traversal.fingerprint,
        timestamp: traversal.timestamp,
      };
      return JSON.stringify(obj);
    } catch (err) {
      throw new SerializationError('Failed to serialize traversal result', {
        traversalId: traversal.id,
        error: String(err),
      });
    }
  }

  public serializePretty(traversal: TraversalResult): string {
    try {
      const obj = {
        id: traversal.id,
        strategy: traversal.strategy,
        steps: traversal.steps.map((s) => ({
          nodeId: s.nodeId,
          depth: s.depth,
          parentId: s.parentId,
          edgeId: s.edgeId,
          metadata: s.metadata,
        })),
        visited: [...traversal.visited],
        depth: traversal.depth,
        nodeCount: traversal.nodeCount,
        startNode: traversal.startNode,
        endNode: traversal.endNode,
        duration: traversal.duration,
        status: traversal.status,
        fingerprint: traversal.fingerprint,
        timestamp: traversal.timestamp,
      };
      return JSON.stringify(obj, null, 2);
    } catch (err) {
      throw new SerializationError('Failed to serialize traversal result prettily', {
        traversalId: traversal.id,
        error: String(err),
      });
    }
  }

  public deserialize(json: string): TraversalResult {
    try {
      const obj = JSON.parse(json);
      return {
        id: obj.id,
        strategy: obj.strategy,
        steps: obj.steps.map((s: Record<string, unknown>) => ({
          nodeId: s.nodeId as NodeId,
          depth: s.depth as number,
          parentId: (s.parentId as NodeId) ?? null,
          edgeId: (s.edgeId as string) ?? null,
          metadata: (s.metadata as Record<string, unknown>) ?? {},
        })),
        visited: new Set(obj.visited as NodeId[]),
        depth: obj.depth as number,
        nodeCount: obj.nodeCount as number,
        startNode: obj.startNode as NodeId,
        endNode: (obj.endNode as NodeId) ?? null,
        duration: obj.duration as number,
        status: obj.status,
        fingerprint: obj.fingerprint as string,
        timestamp: obj.timestamp as string,
      };
    } catch (err) {
      throw new SerializationError('Failed to deserialize traversal result', {
        error: String(err),
      });
    }
  }

  public serializeSteps(steps: TraversalStep[]): string {
    try {
      return JSON.stringify(steps);
    } catch (err) {
      throw new SerializationError('Failed to serialize traversal steps', {
        error: String(err),
      });
    }
  }

  public deserializeSteps(json: string): TraversalStep[] {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) {
        throw new SerializationError('Expected array for traversal steps');
      }
      return arr.map((s: Record<string, unknown>) => ({
        nodeId: s.nodeId as NodeId,
        depth: s.depth as number,
        parentId: (s.parentId as NodeId) ?? null,
        edgeId: (s.edgeId as string) ?? null,
        metadata: (s.metadata as Record<string, unknown>) ?? {},
      }));
    } catch (err) {
      if (err instanceof SerializationError) throw err;
      throw new SerializationError('Failed to deserialize traversal steps', {
        error: String(err),
      });
    }
  }

  public verifySerialization(traversal: TraversalResult): boolean {
    try {
      const json = this.serialize(traversal);
      const deserialized = this.deserialize(json);
      return (
        deserialized.id === traversal.id &&
        deserialized.strategy === traversal.strategy &&
        deserialized.depth === traversal.depth &&
        deserialized.nodeCount === traversal.nodeCount &&
        deserialized.startNode === traversal.startNode &&
        deserialized.endNode === traversal.endNode &&
        deserialized.duration === traversal.duration &&
        deserialized.status === traversal.status &&
        deserialized.fingerprint === traversal.fingerprint &&
        deserialized.timestamp === traversal.timestamp &&
        deserialized.steps.length === traversal.steps.length &&
        deserialized.visited.size === traversal.visited.size
      );
    } catch {
      return false;
    }
  }
}
