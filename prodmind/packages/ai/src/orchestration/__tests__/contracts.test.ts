import { describe, expect, it } from 'vitest';

import {
  canTransition,
  createExecutionEdge,
  createExecutionEvent,
  createExecutionGraph,
  createExecutionMetadata,
  createExecutionNode,
  createExecutionNodeResult,
  createExecutionSession,
  generateExecutionId,
  isActive,
  isTerminal,
  validateGraph,
} from '../contracts/index.ts';

describe('Execution Contracts', () => {
  describe('createExecutionNode', () => {
    it('creates a frozen node with all fields', () => {
      const node = createExecutionNode({
        id: 'n1', type: 'prompt', label: 'Generate response',
        config: { provider: 'openai', model: 'gpt-4' },
        dependencies: ['n0'],
      });
      expect(node.id).toBe('n1');
      expect(node.type).toBe('prompt');
      expect(node.label).toBe('Generate response');
      expect(node.config).toEqual({ provider: 'openai', model: 'gpt-4' });
      expect(node.dependencies).toEqual(['n0']);
      expect(Object.isFrozen(node)).toBe(true);
      expect(Object.isFrozen(node.config)).toBe(true);
      expect(Object.isFrozen(node.dependencies)).toBe(true);
    });

    it('defaults dependencies to empty array', () => {
      const node = createExecutionNode({ id: 'n1', type: 'transform', label: 't' });
      expect(node.dependencies).toEqual([]);
    });
  });

  describe('createExecutionEdge', () => {
    it('creates a frozen edge', () => {
      const edge = createExecutionEdge({ source: 'n1', target: 'n2', condition: 'if-valid' });
      expect(edge.source).toBe('n1');
      expect(edge.target).toBe('n2');
      expect(edge.condition).toBe('if-valid');
      expect(Object.isFrozen(edge)).toBe(true);
    });

    it('defaults condition to empty string', () => {
      const edge = createExecutionEdge({ source: 'a', target: 'b' });
      expect(edge.condition).toBe('');
    });
  });

  describe('createExecutionGraph', () => {
    it('creates a frozen graph with nodes and edges', () => {
      const n1 = createExecutionNode({ id: 'n1', type: 'prompt', label: 'p1' });
      const n2 = createExecutionNode({ id: 'n2', type: 'transform', label: 't1', dependencies: ['n1'] });
      const e1 = createExecutionEdge({ source: 'n1', target: 'n2' });

      const graph = createExecutionGraph({
        id: 'g1', nodes: [n1, n2], edges: [e1],
        metadata: { correlationId: 'corr-1' },
      });

      expect(graph.id).toBe('g1');
      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1);
      expect(graph.metadata.correlationId).toBe('corr-1');
      expect(Object.isFrozen(graph)).toBe(true);
      expect(Object.isFrozen(graph.nodes)).toBe(true);
    });

    it('generates id when not provided', () => {
      const graph = createExecutionGraph({ nodes: [] });
      expect(graph.id).toMatch(/^graph_/);
    });

    it('defaults edges and metadata', () => {
      const graph = createExecutionGraph({ nodes: [] });
      expect(graph.edges).toEqual([]);
      expect(graph.metadata.fingerprint).toBe('');
    });
  });

  describe('createExecutionMetadata', () => {
    it('creates frozen metadata with defaults', () => {
      const m = createExecutionMetadata();
      expect(m.correlationId).toBe('');
      expect(m.fingerprint).toBe('');
      expect(m.source).toBe('');
      expect(Object.isFrozen(m)).toBe(true);
    });
  });

  describe('createExecutionSession', () => {
    it('creates session with pending node states', () => {
      const n1 = createExecutionNode({ id: 'n1', type: 'prompt', label: 'p' });
      const graph = createExecutionGraph({ nodes: [n1] });
      const session = createExecutionSession({ graph, metadata: { correlationId: 'c1' } });

      expect(session.state).toBe('pending');
      expect(session.nodeStates).toEqual({ n1: 'pending' });
      expect(session.timeline).toEqual([]);
      expect(session.metadata.correlationId).toBe('c1');
      expect(Object.isFrozen(session)).toBe(true);
      expect(Object.isFrozen(session.nodeStates)).toBe(true);
    });
  });

  describe('createExecutionEvent', () => {
    it('creates a frozen event', () => {
      const event = createExecutionEvent({
        sequenceId: 1, type: 'started', nodeId: 'n1',
        data: { duration: 100 },
      });
      expect(event.sequenceId).toBe(1);
      expect(event.type).toBe('started');
      expect(event.nodeId).toBe('n1');
      expect(Object.isFrozen(event)).toBe(true);
      expect(Object.isFrozen(event.data)).toBe(true);
    });

    it('defaults timestamp and data', () => {
      const event = createExecutionEvent({ sequenceId: 1, type: 'completed', nodeId: 'n1' });
      expect(event.timestamp).toBe('');
      expect(event.data).toEqual({});
    });
  });

  describe('createExecutionNodeResult', () => {
    it('creates a frozen result with defaults', () => {
      const r = createExecutionNodeResult({ nodeId: 'n1' });
      expect(r.success).toBe(true);
      expect(r.error).toBe('');
      expect(r.durationMs).toBe(0);
      expect(Object.isFrozen(r)).toBe(true);
    });
  });

  describe('generateExecutionId', () => {
    it('generates unique ids', () => {
      const a = generateExecutionId('n');
      const b = generateExecutionId('n');
      expect(a).not.toBe(b);
    });
  });

  describe('validateGraph', () => {
    it('passes for valid graph', () => {
      const n1 = createExecutionNode({ id: 'n1', type: 'prompt', label: 'p' });
      const n2 = createExecutionNode({ id: 'n2', type: 'transform', label: 't', dependencies: ['n1'] });
      const graph = createExecutionGraph({ nodes: [n1, n2], edges: [createExecutionEdge({ source: 'n1', target: 'n2' })] });
      expect(validateGraph(graph).valid).toBe(true);
    });

    it('rejects duplicate node ids', () => {
      const n1 = createExecutionNode({ id: 'dup', type: 'prompt', label: 'p' });
      const n2 = createExecutionNode({ id: 'dup', type: 'transform', label: 't' });
      const graph = createExecutionGraph({ nodes: [n1, n2] });
      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    it('rejects edges to unknown nodes', () => {
      const n1 = createExecutionNode({ id: 'n1', type: 'prompt', label: 'p' });
      const graph = createExecutionGraph({
        nodes: [n1],
        edges: [createExecutionEdge({ source: 'n1', target: 'missing' })],
      });
      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('target "missing"'))).toBe(true);
    });

    it('rejects self-loop edges', () => {
      const n1 = createExecutionNode({ id: 'n1', type: 'prompt', label: 'p' });
      const graph = createExecutionGraph({
        nodes: [n1],
        edges: [createExecutionEdge({ source: 'n1', target: 'n1' })],
      });
      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('self-loop'))).toBe(true);
    });

    it('rejects unknown dependency references', () => {
      const n1 = createExecutionNode({ id: 'n1', type: 'prompt', label: 'p', dependencies: ['ghost'] });
      const graph = createExecutionGraph({ nodes: [n1] });
      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ghost'))).toBe(true);
    });

    it('rejects graph with empty id', () => {
      const graph = createExecutionGraph({ id: '', nodes: [] });
      const result = validateGraph(graph);
      expect(result.valid).toBe(false);
    });

    it('returns frozen result', () => {
      const graph = createExecutionGraph({ nodes: [] });
      const result = validateGraph(graph);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.errors)).toBe(true);
    });
  });

  describe('State transitions', () => {
    it('allows pending → ready', () => {
      expect(canTransition('pending', 'ready')).toBe(true);
    });

    it('allows ready → running', () => {
      expect(canTransition('ready', 'running')).toBe(true);
    });

    it('allows running → completed', () => {
      expect(canTransition('running', 'completed')).toBe(true);
    });

    it('allows any → cancelled', () => {
      expect(canTransition('pending', 'cancelled')).toBe(true);
      expect(canTransition('ready', 'cancelled')).toBe(true);
      expect(canTransition('running', 'cancelled')).toBe(true);
    });

    it('allows any → replaying', () => {
      expect(canTransition('completed', 'replaying')).toBe(true);
      expect(canTransition('failed', 'replaying')).toBe(true);
      expect(canTransition('cancelled', 'replaying')).toBe(true);
    });

    it('disallows pending → completed', () => {
      expect(canTransition('pending', 'completed')).toBe(false);
    });

    it('disallows completed → running', () => {
      expect(canTransition('completed', 'running')).toBe(false);
    });
  });

  describe('isTerminal', () => {
    it('returns true for terminal states', () => {
      expect(isTerminal('completed')).toBe(true);
      expect(isTerminal('failed')).toBe(true);
      expect(isTerminal('cancelled')).toBe(true);
    });

    it('returns false for non-terminal states', () => {
      expect(isTerminal('pending')).toBe(false);
      expect(isTerminal('running')).toBe(false);
      expect(isTerminal('replaying')).toBe(false);
    });
  });

  describe('isActive', () => {
    it('returns true for active states', () => {
      expect(isActive('pending')).toBe(true);
      expect(isActive('ready')).toBe(true);
      expect(isActive('running')).toBe(true);
      expect(isActive('replaying')).toBe(true);
    });

    it('returns false for non-active states', () => {
      expect(isActive('completed')).toBe(false);
      expect(isActive('failed')).toBe(false);
      expect(isActive('cancelled')).toBe(false);
    });
  });
});
