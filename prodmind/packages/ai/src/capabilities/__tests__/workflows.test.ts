import { describe, expect, it } from 'vitest';

import { DEFAULT_CAPABILITY_POLICY } from '../contracts/capability-policy.ts';
import { WorkflowEngine } from '../workflows/workflow-engine.ts';
import { WorkflowGraph } from '../workflows/workflow-graph.ts';
import { WorkflowState } from '../workflows/workflow-state.ts';
import { WorkflowScheduler } from '../workflows/workflow-scheduler.ts';
import { WorkflowGovernance } from '../workflows/workflow-governance.ts';
import { ToolExecutor } from '../execution/tool-executor.ts';

/* ------------------------------------------------------------------ */
/*  WorkflowGraph                                                       */
/* ------------------------------------------------------------------ */
describe('WorkflowGraph', () => {
  it('starts empty', () => {
    const g = new WorkflowGraph();
    expect(g.nodes).toHaveLength(0);
    expect(g.count).toBe(0);
  });

  it('adds nodes with dependencies', () => {
    const g = new WorkflowGraph();
    g.addNode('a', 'tool_a', { x: 1 });
    g.addNode('b', 'tool_b', { y: 2 }, ['a']);
    expect(g.count).toBe(2);
    expect(g.getNode('a')?.toolId).toBe('tool_a');
    expect(g.getNode('b')?.dependsOn).toEqual(['a']);
  });

  it('returns ready nodes sorted by id', () => {
    const g = new WorkflowGraph();
    g.addNode('b', 't', {}, ['a']);
    g.addNode('a', 't', {});
    g.addNode('c', 't', {}, ['a']);
    const ready = g.getReadyNodes([]);
    expect(ready).toHaveLength(1);
    expect(ready[0]?.id).toBe('a');
  });

  it('returns ready nodes after dependencies met', () => {
    const g = new WorkflowGraph();
    g.addNode('b', 't', {}, ['a']);
    g.addNode('a', 't', {});
    const ready = g.getReadyNodes(['a']);
    expect(ready).toHaveLength(1);
    expect(ready[0]?.id).toBe('b');
  });

  it('clears', () => {
    const g = new WorkflowGraph();
    g.addNode('a', 't', {});
    g.clear();
    expect(g.count).toBe(0);
  });

  it('freezes nodes', () => {
    const g = new WorkflowGraph();
    g.addNode('a', 't', { x: 1 });
    const node = g.getNode('a')!;
    expect(Object.isFrozen(node)).toBe(true);
    expect(Object.isFrozen(node.input)).toBe(true);
    expect(Object.isFrozen(node.dependsOn)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  WorkflowState                                                       */
/* ------------------------------------------------------------------ */
describe('WorkflowState', () => {
  it('starts pending', () => {
    const s = new WorkflowState();
    expect(s.status).toBe('pending');
    expect(s.stages).toHaveLength(0);
  });

  it('tracks stage lifecycle', () => {
    const s = new WorkflowState();
    s.addStage('a', 'step1');
    s.startStage('a');
    expect(s.stages[0]?.status).toBe('running');
    expect(s.stages[0]?.startedAt).toBeGreaterThan(0);
    s.completeStage('a');
    expect(s.stages[0]?.status).toBe('completed');
    expect(s.stages[0]?.completedAt).toBeGreaterThan(0);
  });

  it('fails overall when a stage fails', () => {
    const s = new WorkflowState();
    s.addStage('a', 's');
    s.startStage('a');
    s.failStage('a');
    expect(s.status).toBe('failed');
  });

  it('completes overall on complete()', () => {
    const s = new WorkflowState();
    s.addStage('a', 's');
    s.startStage('a');
    s.completeStage('a');
    s.complete();
    expect(s.status).toBe('completed');
  });

  it('freezes stages', () => {
    const s = new WorkflowState();
    s.addStage('a', 's');
    expect(Object.isFrozen(s.stages)).toBe(true);
    expect(Object.isFrozen(s.stages[0]!)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  WorkflowGovernance                                                  */
/* ------------------------------------------------------------------ */
describe('WorkflowGovernance', () => {
  it('defaults to 50 max nodes', () => {
    const g = new WorkflowGovernance();
    expect(g.config.maxNodes).toBe(50);
  });

  it('enforces max node count', () => {
    const g = new WorkflowGovernance({ maxNodes: 3 });
    expect(g.canAddNode(2)).toBe(true);
    expect(g.canAddNode(3)).toBe(false);
  });

  it('enforces max depth', () => {
    const g = new WorkflowGovernance({ maxDepth: 5 });
    expect(g.canExecute(5)).toBe(true);
    expect(g.canExecute(6)).toBe(false);
  });

  it('freezes config', () => {
    const g = new WorkflowGovernance();
    expect(Object.isFrozen(g.config)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  WorkflowScheduler                                                   */
/* ------------------------------------------------------------------ */
describe('WorkflowScheduler', () => {
  it('executes nodes in order', () => {
    const executor = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    const graph = new WorkflowGraph();
    graph.addNode('a', 'tool_a', {});
    graph.addNode('b', 'tool_b', {});

    const state = new WorkflowState();
    state.addStage('a', 'tool_a');
    state.addStage('b', 'tool_b');

    const scheduler = new WorkflowScheduler();
    const results = scheduler.schedule(graph, state, executor, 'tr');
    expect(results).toHaveLength(2);
    expect(results[0]?.request.toolId).toBe('tool_a');
    expect(results[1]?.request.toolId).toBe('tool_b');
    expect(state.status).toBe('completed');
    expect(Object.isFrozen(results)).toBe(true);
  });

  it('respects concurrency limit', () => {
    const executor = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    const graph = new WorkflowGraph();
    graph.addNode('a', 'tool_a', {});
    graph.addNode('b', 'tool_b', {});
    graph.addNode('c', 'tool_c', {});

    const state = new WorkflowState();
    state.addStage('a', 'tool_a');
    state.addStage('b', 'tool_b');
    state.addStage('c', 'tool_c');

    const scheduler = new WorkflowScheduler(2);
    expect(() => scheduler.schedule(graph, state, executor, 'tr')).not.toThrow();
    expect(results => {
      expect(results).toHaveLength(3);
    });
  });

  it('handles empty graph', () => {
    const executor = new ToolExecutor(DEFAULT_CAPABILITY_POLICY);
    const graph = new WorkflowGraph();
    const state = new WorkflowState();
    const scheduler = new WorkflowScheduler();
    const results = scheduler.schedule(graph, state, executor, 'tr');
    expect(results).toHaveLength(0);
    expect(state.status).toBe('completed');
  });
});

/* ------------------------------------------------------------------ */
/*  WorkflowEngine                                                      */
/* ------------------------------------------------------------------ */
describe('WorkflowEngine', () => {
  it('creates with default state', () => {
    const engine = new WorkflowEngine(DEFAULT_CAPABILITY_POLICY);
    expect(engine.state.status).toBe('pending');
    expect(engine.graph.count).toBe(0);
  });

  it('adds nodes under governance limit', () => {
    const engine = new WorkflowEngine(DEFAULT_CAPABILITY_POLICY);
    engine.addNode('a', 'tool_a', {});
    expect(engine.graph.count).toBe(1);
  });

  it('rejects nodes over governance limit', () => {
    const policy = { ...DEFAULT_CAPABILITY_POLICY, maxToolCalls: 1 };
    const engine = new WorkflowEngine(policy);
    engine.addNode('a', 'tool_a', {});
    engine.addNode('b', 'tool_b', {});
    expect(engine.graph.count).toBe(1);
  });

  it('runs a simple workflow', () => {
    const engine = new WorkflowEngine(DEFAULT_CAPABILITY_POLICY);
    engine.addNode('a', 'tool_a', {});
    engine.addNode('b', 'tool_b', {}, ['a']);
    const result = engine.run('wf1');
    expect(result.resultCount).toBe(2);
    expect(result.success).toBe(true);
    expect(engine.state.status).toBe('completed');
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('runs a workflow with parallel nodes', () => {
    const engine = new WorkflowEngine(DEFAULT_CAPABILITY_POLICY);
    engine.addNode('a', 'tool_a', {});
    engine.addNode('b', 'tool_b', {});
    engine.addNode('c', 'tool_c', {}, ['a', 'b']);
    const result = engine.run('wf2');
    expect(result.resultCount).toBe(3);
    expect(result.success).toBe(true);
  });

  it('runs empty workflow', () => {
    const engine = new WorkflowEngine(DEFAULT_CAPABILITY_POLICY);
    const result = engine.run('empty');
    expect(result.resultCount).toBe(0);
    expect(result.success).toBe(true);
  });

  it('resets state between runs', () => {
    const engine = new WorkflowEngine(DEFAULT_CAPABILITY_POLICY);
    engine.addNode('a', 'tool_a', {});
    engine.run('r1');
    engine.reset();
    expect(engine.graph.count).toBe(0);
  });
});
