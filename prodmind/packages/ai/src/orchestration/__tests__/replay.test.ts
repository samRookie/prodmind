import { describe, expect, it } from 'vitest';

import { createExecutionEvent, createExecutionGraph, createExecutionNode, createExecutionNodeResult } from '../contracts/index.ts';
import { EventBus } from '../replay/event-bus.ts';
import { EventStore } from '../replay/event-store.ts';
import { OrchestrationReplay } from '../replay/orchestration-replay.ts';
import { ProvenanceTracker } from '../replay/provenance-tracker.ts';

// ---------------------------------------------------------------------------
// EventBus
// ---------------------------------------------------------------------------
describe('EventBus', () => {
  it('emits event to subscribers', () => {
    const bus = new EventBus();
    const received: string[] = [];
    bus.subscribe('started', e => received.push(e.nodeId));
    bus.emit(createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }));
    expect(received).toEqual(['a']);
  });

  it('does not notify subscribers of other types', () => {
    const bus = new EventBus();
    const received: string[] = [];
    bus.subscribe('completed', e => received.push(e.nodeId));
    bus.emit(createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }));
    expect(received).toEqual([]);
  });

  it('unsubscribe removes handler', () => {
    const bus = new EventBus();
    const received: string[] = [];
    const unsub = bus.subscribe('completed', e => received.push(e.nodeId));
    unsub();
    bus.emit(createExecutionEvent({ sequenceId: 1, type: 'completed', nodeId: 'a' }));
    expect(received).toEqual([]);
  });

  it('subscribeAll receives all events', () => {
    const bus = new EventBus();
    const received: string[] = [];
    bus.subscribeAll(e => received.push(`${e.type}:${e.nodeId}`));
    bus.emit(createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }));
    bus.emit(createExecutionEvent({ sequenceId: 2, type: 'completed', nodeId: 'b' }));
    expect(received).toContain('started:a');
    expect(received).toContain('completed:b');
  });

  it('maintains append-only history', () => {
    const bus = new EventBus();
    bus.emit(createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }));
    bus.emit(createExecutionEvent({ sequenceId: 2, type: 'completed', nodeId: 'a' }));
    expect(bus.getHistory()).toHaveLength(2);
  });

  it('returns frozen history', () => {
    const bus = new EventBus();
    bus.emit(createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }));
    expect(Object.isFrozen(bus.getHistory())).toBe(true);
  });

  it('clear resets state', () => {
    const bus = new EventBus();
    bus.emit(createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }));
    bus.clear();
    expect(bus.getHistory()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// EventStore
// ---------------------------------------------------------------------------
describe('EventStore', () => {
  function makeEvents(): readonly ReturnType<typeof createExecutionEvent>[] {
    return [
      createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }),
      createExecutionEvent({ sequenceId: 2, type: 'completed', nodeId: 'a' }),
      createExecutionEvent({ sequenceId: 3, type: 'started', nodeId: 'b' }),
      createExecutionEvent({ sequenceId: 4, type: 'failed', nodeId: 'b' }),
    ];
  }

  it('appends and retrieves events', () => {
    const store = new EventStore();
    store.append(makeEvents()[0]!);
    expect(store.getAll()).toHaveLength(1);
  });

  it('appends batch', () => {
    const store = new EventStore();
    store.appendBatch(makeEvents());
    expect(store.getAll()).toHaveLength(4);
  });

  it('getByNodeId filters correctly', () => {
    const store = new EventStore();
    store.appendBatch(makeEvents());
    expect(store.getByNodeId('a')).toHaveLength(2);
    expect(store.getByNodeId('b')).toHaveLength(2);
    expect(store.getByNodeId('c')).toHaveLength(0);
  });

  it('getByType filters correctly', () => {
    const store = new EventStore();
    store.appendBatch(makeEvents());
    expect(store.getByType('started')).toHaveLength(2);
    expect(store.getByType('completed')).toHaveLength(1);
    expect(store.getByType('failed')).toHaveLength(1);
  });

  it('getRange filters by sequence range', () => {
    const store = new EventStore();
    store.appendBatch(makeEvents());
    const range = store.getRange(2, 3);
    expect(range).toHaveLength(2);
    expect(range[0]!.sequenceId).toBe(2);
    expect(range[1]!.sequenceId).toBe(3);
  });

  it('getCount returns correct count', () => {
    const store = new EventStore();
    store.appendBatch(makeEvents());
    expect(store.getCount()).toBe(4);
  });

  it('clear resets store', () => {
    const store = new EventStore();
    store.appendBatch(makeEvents());
    store.clear();
    expect(store.getCount()).toBe(0);
  });

  it('returns frozen arrays', () => {
    const store = new EventStore();
    expect(Object.isFrozen(store.getAll())).toBe(true);
    expect(Object.isFrozen(store.getByNodeId('a'))).toBe(true);
    expect(Object.isFrozen(store.getRange(1, 2))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ProvenanceTracker
// ---------------------------------------------------------------------------
describe('ProvenanceTracker', () => {
  function makeGraph() {
    return createExecutionGraph({
      nodes: [
        createExecutionNode({ id: 'a', type: 'prompt', label: 'A' }),
        createExecutionNode({ id: 'b', type: 'transform', label: 'B', dependencies: ['a'] }),
        createExecutionNode({ id: 'c', type: 'transform', label: 'C', dependencies: ['a'] }),
        createExecutionNode({ id: 'd', type: 'transform', label: 'D', dependencies: ['b', 'c'] }),
      ],
    });
  }

  it('records lineage for a node', () => {
    const graph = makeGraph();
    const tracker = new ProvenanceTracker();
    const result = createExecutionNodeResult({ nodeId: 'b', output: { val: 42 }, success: true });
    tracker.recordNodeOutput('b', result, graph);

    const lineage = tracker.getLineage('b');
    expect(lineage).toBeDefined();
    expect(lineage!.dependedOn).toEqual(['a']);
    expect(lineage!.outputKeys).toEqual(['val']);
  });

  it('getDownstream returns nodes that depend on this one', () => {
    const graph = makeGraph();
    const tracker = new ProvenanceTracker();
    tracker.recordNodeOutput('a', createExecutionNodeResult({ nodeId: 'a', output: { x: 1 }, success: true }), graph);
    tracker.recordNodeOutput('b', createExecutionNodeResult({ nodeId: 'b', output: { y: 2 }, success: true }), graph);
    tracker.recordNodeOutput('c', createExecutionNodeResult({ nodeId: 'c', output: { z: 3 }, success: true }), graph);

    const downstream = tracker.getDownstream('a');
    expect(downstream).toEqual(['b', 'c']);
  });

  it('getUpstream returns nodes this one depends on', () => {
    const graph = makeGraph();
    const tracker = new ProvenanceTracker();
    tracker.recordNodeOutput('a', createExecutionNodeResult({ nodeId: 'a', output: {}, success: true }), graph);
    tracker.recordNodeOutput('b', createExecutionNodeResult({ nodeId: 'b', output: {}, success: true }), graph);

    expect(tracker.getUpstream('b')).toEqual(['a']);
  });

  it('returns empty for unknown node', () => {
    const tracker = new ProvenanceTracker();
    expect(tracker.getLineage('x')).toBeUndefined();
    expect(tracker.getUpstream('x')).toEqual([]);
    expect(tracker.getDownstream('x')).toEqual([]);
  });

  it('getAll returns all lineage records', () => {
    const graph = makeGraph();
    const tracker = new ProvenanceTracker();
    tracker.recordNodeOutput('a', createExecutionNodeResult({ nodeId: 'a', output: {}, success: true }), graph);
    tracker.recordNodeOutput('b', createExecutionNodeResult({ nodeId: 'b', output: {}, success: true }), graph);
    expect(tracker.getAll()).toHaveLength(2);
  });

  it('clear resets tracker', () => {
    const graph = makeGraph();
    const tracker = new ProvenanceTracker();
    tracker.recordNodeOutput('a', createExecutionNodeResult({ nodeId: 'a', output: {}, success: true }), graph);
    tracker.clear();
    expect(tracker.getAll()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// OrchestrationReplay
// ---------------------------------------------------------------------------
describe('OrchestrationReplay', () => {
  it('replays a successful session', async () => {
    const graph = createExecutionGraph({
      nodes: [createExecutionNode({ id: 'a', type: 'prompt', label: 'A' })],
    });
    const storedEvents = [
      createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }),
      createExecutionEvent({ sequenceId: 2, type: 'completed', nodeId: 'a' }),
    ];
    const results = {
      a: createExecutionNodeResult({ nodeId: 'a', output: { ok: true }, success: true }),
    };

    const replay = new OrchestrationReplay();
    const result = await replay.replay({ graph, storedEvents, results });
    expect(result.verified).toBe(true);
    expect(result.mismatches).toEqual([]);
    expect(result.session.nodeStates.a).toBe('completed');
  });

  it('detects mismatches in success/failure', async () => {
    const graph = createExecutionGraph({
      nodes: [createExecutionNode({ id: 'a', type: 'prompt', label: 'A' })],
    });
    const storedEvents = [
      createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }),
      createExecutionEvent({ sequenceId: 2, type: 'failed', nodeId: 'a' }),
    ];
    const results = {
      a: createExecutionNodeResult({ nodeId: 'a', output: {}, success: true }),
    };

    const replay = new OrchestrationReplay();
    const result = await replay.replay({ graph, storedEvents, results });
    expect(result.verified).toBe(false);
    expect(result.mismatches.length).toBeGreaterThan(0);
  });

  it('reports missing results', async () => {
    const graph = createExecutionGraph({
      nodes: [createExecutionNode({ id: 'a', type: 'prompt', label: 'A' })],
    });
    const storedEvents = [
      createExecutionEvent({ sequenceId: 1, type: 'completed', nodeId: 'a' }),
    ];

    const replay = new OrchestrationReplay();
    const result = await replay.replay({ graph, storedEvents, results: {} });
    expect(result.verified).toBe(false);
    expect(result.mismatches.some(m => m.includes('Missing result'))).toBe(true);
  });

  it('provides access to event bus, store, and provenance', () => {
    const replay = new OrchestrationReplay();
    expect(replay.getEventBus()).toBeDefined();
    expect(replay.getEventStore()).toBeDefined();
    expect(replay.getProvenance()).toBeDefined();
  });

  it('returns frozen result', async () => {
    const graph = createExecutionGraph({
      nodes: [createExecutionNode({ id: 'a', type: 'prompt', label: 'A' })],
    });
    const replay = new OrchestrationReplay();
    const result = await replay.replay({
      graph,
      storedEvents: [
        createExecutionEvent({ sequenceId: 1, type: 'started', nodeId: 'a' }),
        createExecutionEvent({ sequenceId: 2, type: 'completed', nodeId: 'a' }),
      ],
      results: { a: createExecutionNodeResult({ nodeId: 'a', output: {}, success: true }) },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.mismatches)).toBe(true);
  });
});
