import type { GraphQuery } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { computeHash } from '../utils/index.ts';

export class GraphQueryEngine {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public execute(query: GraphQuery): { result: unknown; query: GraphQuery; duration: number } {
    const start = performance.now();
    let result: unknown;
    switch (query.target) {
      case 'NODES': {
        result = this.graph.getAllNodes();
        break;
      }
      case 'NEIGHBORHOODS': {
        const from = query.parameters.from;
        if (from) {
          result = this.graph.getNeighbors(from).map((n) => n.id);
        } else {
          result = [];
        }
        break;
      }
      default:
        result = [];
    }
    const duration = performance.now() - start;
    return { result, query, duration };
  }
}

export class QueryReplay {
  private engine: GraphQueryEngine;

  constructor(engine: GraphQueryEngine) {
    this.engine = engine;
  }

  public replayQuery(query: GraphQuery): { result: unknown; query: GraphQuery; duration: number } {
    return this.engine.execute(query);
  }

  public compareQueryResults(original: unknown, replayed: unknown): { identical: boolean; differences: string[] } {
    const differences: string[] = [];
    const origJson = JSON.stringify(original);
    const replJson = JSON.stringify(replayed);
    if (origJson !== replJson) {
      differences.push('query results differ');
    }
    return { identical: differences.length === 0, differences };
  }

  public verifyQueryFingerprint(query: GraphQuery): boolean {
    const data = JSON.stringify({ target: query.target, clauses: query.clauses, parameters: query.parameters });
    const expected = computeHash(data);
    return expected === query.fingerprint;
  }
}
