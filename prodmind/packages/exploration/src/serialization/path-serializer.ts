import type { PathResult, NodeId } from '../types/index.ts';
import { SerializationError } from '../errors/index.ts';

export class PathSerializer {
  public serialize(path: PathResult): string {
    try {
      return JSON.stringify(path);
    } catch (err) {
      throw new SerializationError('Failed to serialize path result', {
        error: String(err),
      });
    }
  }

  public deserialize(json: string): PathResult {
    try {
      const obj = JSON.parse(json);
      if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
        throw new SerializationError('Invalid path result JSON structure');
      }
      return obj as PathResult;
    } catch (err) {
      if (err instanceof SerializationError) throw err;
      throw new SerializationError('Failed to deserialize path result', {
        error: String(err),
      });
    }
  }

  public serializePaths(paths: PathResult[]): string {
    try {
      return JSON.stringify(paths);
    } catch (err) {
      throw new SerializationError('Failed to serialize path results', {
        count: paths.length,
        error: String(err),
      });
    }
  }

  public deserializePaths(json: string): PathResult[] {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) {
        throw new SerializationError('Expected array for path results');
      }
      return arr as PathResult[];
    } catch (err) {
      if (err instanceof SerializationError) throw err;
      throw new SerializationError('Failed to deserialize path results', {
        error: String(err),
      });
    }
  }

  public toNodeSequence(path: PathResult): NodeId[] {
    return [...path.nodes];
  }
}
