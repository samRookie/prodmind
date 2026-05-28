import type { Neighborhood } from '../types/index.ts';
import { SerializationError } from '../errors/index.ts';

export class NeighborhoodSerializer {
  public serialize(neighborhood: Neighborhood): string {
    try {
      return JSON.stringify(neighborhood);
    } catch (err) {
      throw new SerializationError('Failed to serialize neighborhood', {
        center: neighborhood.center,
        error: String(err),
      });
    }
  }

  public deserialize(json: string): Neighborhood {
    try {
      const obj = JSON.parse(json);
      if (!obj.center || !Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) {
        throw new SerializationError('Invalid neighborhood JSON structure');
      }
      return obj as Neighborhood;
    } catch (err) {
      if (err instanceof SerializationError) throw err;
      throw new SerializationError('Failed to deserialize neighborhood', {
        error: String(err),
      });
    }
  }

  public serializeNeighborhoods(neighborhoods: Neighborhood[]): string {
    try {
      return JSON.stringify(neighborhoods);
    } catch (err) {
      throw new SerializationError('Failed to serialize neighborhoods', {
        count: neighborhoods.length,
        error: String(err),
      });
    }
  }

  public deserializeNeighborhoods(json: string): Neighborhood[] {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) {
        throw new SerializationError('Expected array for neighborhoods');
      }
      return arr as Neighborhood[];
    } catch (err) {
      if (err instanceof SerializationError) throw err;
      throw new SerializationError('Failed to deserialize neighborhoods', {
        error: String(err),
      });
    }
  }
}
