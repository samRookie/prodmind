import { describe, expect, it } from 'vitest';

import { createMemoryRecord, createRetrievalQuery,createSemanticEdge, createSemanticNode } from '../contracts/memory-factories.ts';
import { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { SemanticGraph } from '../graph/semantic-graph.ts';
import { MemoryIntegration } from '../integration/memory-integration.ts';
import { RetrievalEngine } from '../retrieval/retrieval-engine.ts';

/* ------------------------------------------------------------------ */
/*  High-volume record ingestion                                        */
/* ------------------------------------------------------------------ */
describe('stress: ingestion', () => {
  it('ingests 1000 records', () => {
    const store = new GraphMemoryStore();
    for (let i = 0; i < 1000; i++) {
      store.storeRecord(createMemoryRecord({ category: i % 2 === 0 ? 'execution' : 'provenance' as never }));
    }
    expect(store.recordCount()).toBe(1000);
  });

  it('ingests 5000 records with category filtering', () => {
    const store = new GraphMemoryStore();
    for (let i = 0; i < 5000; i++) {
      store.storeRecord(createMemoryRecord({ category: 'execution' }));
    }
    expect(store.getRecordsByCategory('execution')).toHaveLength(5000);
  });
});

/* ------------------------------------------------------------------ */
/*  Large graph traversal                                                */
/* ------------------------------------------------------------------ */
describe('stress: graph traversal', () => {
  it('traverses a chain of 1000 nodes', () => {
    const nodes = Array.from({ length: 1000 }, (_, i) =>
      createSemanticNode({ type: 'file' as never, label: `n${i}`, id: `n${i}` }),
    );
    const edges = nodes.slice(0, -1).map((n, i) =>
      createSemanticEdge({ sourceId: n.id, targetId: nodes[i + 1]!.id, relationship: 'depends_on' }),
    );
    const graph = new SemanticGraph(nodes, edges);
    expect(graph.nodeCount()).toBe(1000);
    expect(graph.edgeCount()).toBe(999);

    const neighbors = graph.getNeighbors('n0', 100);
    expect(neighbors.length).toBeLessThanOrEqual(100);
    expect(neighbors[0]?.depth).toBe(1);
    expect(neighbors[99]?.depth).toBe(100);
  });

  it('traverses a fully connected 100-node graph', () => {
    const nodes = Array.from({ length: 100 }, (_, i) =>
      createSemanticNode({ type: 'file' as never, label: `n${i}`, id: `n${i}` }),
    );
    const edges: ReturnType<typeof createSemanticEdge>[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        edges.push(createSemanticEdge({ sourceId: nodes[i]!.id, targetId: nodes[j]!.id, relationship: 'references' }));
      }
    }
    const graph = new SemanticGraph(nodes, edges);
    expect(graph.edgeCount()).toBe(4950);
    const neighbors = graph.getNeighbors('n0', 2);
    expect(neighbors.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Concurrent retrieval                                                 */
/* ------------------------------------------------------------------ */
describe('stress: retrieval', () => {
  it('retrieves from 1000 records within limits', () => {
    const store = new GraphMemoryStore();
    for (let i = 0; i < 1000; i++) {
      store.storeRecord({ ...createMemoryRecord({ category: 'execution' }), id: `rec_${i}` } as never);
    }

    const engine = new RetrievalEngine(store);
    const seedIds = Array.from({ length: 20 }, (_, i) => `rec_${i}`);
    const query = createRetrievalQuery({ seedIds, maxDepth: 0, maxResults: 50, strategy: 'hybrid' });
    const result = engine.retrieve(query);
    expect(result.total).toBeLessThanOrEqual(50);
  });
});

/* ------------------------------------------------------------------ */
/*  Multi-session integration                                            */
/* ------------------------------------------------------------------ */
describe('stress: integration', () => {
  it('handles 100 sequential executions', () => {
    const mi = new MemoryIntegration();
    for (let i = 0; i < 100; i++) {
      const id = mi.beginExecution(`step_${i}`);
      mi.completeExecution(id, { index: i }, i);
    }
    expect(mi.execution.execution.stepCount).toBe(100);
    expect(mi.replay.recorder.eventCount).toBe(200);
    expect(mi.store.recordCount()).toBeGreaterThanOrEqual(100);
  });

  it('handles 10 integration resets', () => {
    for (let cycle = 0; cycle < 10; cycle++) {
      const mi = new MemoryIntegration();
      for (let i = 0; i < 10; i++) {
        const id = mi.beginExecution(`cycle_${cycle}_step_${i}`);
        mi.completeExecution(id, {}, 0);
      }
      expect(mi.execution.execution.stepCount).toBe(10);
    }
  });
});
