import type { GraphQuery } from '../types/index.ts';
import type { QueryNode } from '../query/graph-query-ast.ts';
import { SerializationError } from '../errors/index.ts';

export class QuerySerializer {
  public serialize(query: GraphQuery): string {
    try {
      return JSON.stringify(query);
    } catch (err) {
      throw new SerializationError('Failed to serialize graph query', {
        queryId: query.id,
        error: String(err),
      });
    }
  }

  public serializeAst(ast: QueryNode): string {
    try {
      return JSON.stringify(ast);
    } catch (err) {
      throw new SerializationError('Failed to serialize query AST', {
        error: String(err),
      });
    }
  }

  public deserialize(json: string): GraphQuery {
    try {
      const obj = JSON.parse(json);
      if (!obj.id || !obj.target || !obj.clauses) {
        throw new SerializationError('Invalid graph query JSON structure');
      }
      return obj as GraphQuery;
    } catch (err) {
      if (err instanceof SerializationError) throw err;
      throw new SerializationError('Failed to deserialize graph query', {
        error: String(err),
      });
    }
  }

  public deserializeAst(json: string): QueryNode {
    try {
      const obj = JSON.parse(json);
      if (obj.type !== 'query') {
        throw new SerializationError('Invalid QueryNode: type must be "query"');
      }
      return obj as QueryNode;
    } catch (err) {
      if (err instanceof SerializationError) throw err;
      throw new SerializationError('Failed to deserialize query AST', {
        error: String(err),
      });
    }
  }

  public serializeHistory(history: GraphQuery[]): string {
    try {
      return JSON.stringify(history);
    } catch (err) {
      throw new SerializationError('Failed to serialize query history', {
        count: history.length,
        error: String(err),
      });
    }
  }

  public deserializeHistory(json: string): GraphQuery[] {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) {
        throw new SerializationError('Expected array for query history');
      }
      return arr as GraphQuery[];
    } catch (err) {
      if (err instanceof SerializationError) throw err;
      throw new SerializationError('Failed to deserialize query history', {
        error: String(err),
      });
    }
  }
}
