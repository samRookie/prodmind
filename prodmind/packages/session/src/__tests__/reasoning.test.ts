import { describe, it, expect } from 'vitest';
import { InteractionRecord } from '../reasoning/interaction-record.ts';
import type { InteractionRecordData } from '../reasoning/interaction-record.ts';
import { AIInteractionHistory } from '../reasoning/ai-interaction-history.ts';
import { ReasoningChain } from '../reasoning/reasoning-chain.ts';
import { ReasoningContext } from '../reasoning/context.ts';
import { compressInteractions, decompressInteractions, summarizeInteractions, extractKeyDecisions } from '../reasoning/compression.ts';
import { queryInteractions, searchInteractions, findRelatedInteractions, getInteractionsByModel } from '../reasoning/query.ts';
import { SessionValidationError } from '../errors/index.ts';

function makeInteraction(id: string, overrides: Partial<InteractionRecordData> = {}): InteractionRecord {
  return new InteractionRecord({
    id,
    sessionId: overrides.sessionId ?? 'sess-1',
    interactionType: overrides.interactionType ?? 'QUERY',
    role: overrides.role ?? 'USER',
    content: overrides.content ?? 'test content',
    sequenceNumber: overrides.sequenceNumber ?? 1,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    ...overrides,
  });
}

describe('InteractionRecord', () => {
  it('should create from data', () => {
    const record = new InteractionRecord({
      id: 'int-1', sessionId: 'sess-1', interactionType: 'QUERY', role: 'USER', content: 'hello', sequenceNumber: 1, createdAt: new Date().toISOString(),
    });
    expect(record.id).toBe('int-1');
    expect(record.contentHash).toBeDefined();
  });

  it('should compute content hash automatically', () => {
    const record = new InteractionRecord({
      id: 'int-1', sessionId: 'sess-1', interactionType: 'QUERY', role: 'USER', content: 'hello world', sequenceNumber: 1, createdAt: new Date().toISOString(),
    });
    expect(record.contentHash).toHaveLength(64);
  });

  it('should create via static factory', () => {
    const record = InteractionRecord.create('sess-1', 'AI', 'RESPONSE', 'response text', 1, { modelId: 'gpt-4', tokensUsed: 100 });
    expect(record.sessionId).toBe('sess-1');
    expect(record.modelId).toBe('gpt-4');
  });

  it('should create with metadata option', () => {
    const record = InteractionRecord.create('sess-1', 'AI', 'RESPONSE', 'text', 1, { metadata: { key: 'val' } });
    expect(record.metadataJson).toBe('{"key":"val"}');
  });

  it('should validate required fields', () => {
    const record = new InteractionRecord({
      id: '', sessionId: '', interactionType: 'QUERY', role: 'USER', content: 'test', sequenceNumber: 1, createdAt: new Date().toISOString(),
    });
    expect(() => record.validate()).toThrow(SessionValidationError);
  });

  it('should reject empty content in validate', () => {
    const record = new InteractionRecord({
      id: 'int-1', sessionId: 'sess-1', interactionType: 'QUERY', role: 'USER', content: '', sequenceNumber: 1, createdAt: new Date().toISOString(),
    });
    expect(() => record.validate()).toThrow(SessionValidationError);
  });

  it('should serialize and deserialize via JSON', () => {
    const original = new InteractionRecord({
      id: 'int-1', sessionId: 'sess-1', interactionType: 'DECISION', role: 'AI', content: 'decision', sequenceNumber: 1, createdAt: new Date().toISOString(), modelId: 'gpt-4',
    });
    const json = original.toJSON();
    const restored = InteractionRecord.fromJSON(json);
    expect(restored.content).toBe('decision');
    expect(restored.modelId).toBe('gpt-4');
  });
});

describe('AIInteractionHistory', () => {
  it('should create with session ID', () => {
    const history = new AIInteractionHistory('sess-1');
    expect(history.sessionId).toBe('sess-1');
  });

  it('should record interaction with incrementing sequence', () => {
    const history = new AIInteractionHistory('sess-1');
    const r1 = history.recordInteraction('USER', 'QUERY', 'hello');
    const r2 = history.recordInteraction('AI', 'RESPONSE', 'world');
    expect(r1.sequenceNumber).toBe(1);
    expect(r2.sequenceNumber).toBe(2);
    expect(history.getInteractionCount()).toBe(2);
  });

  it('should get interactions by type', () => {
    const history = new AIInteractionHistory('sess-1');
    history.recordInteraction('USER', 'QUERY', 'q');
    history.recordInteraction('AI', 'RESPONSE', 'r');
    history.recordInteraction('USER', 'DECISION', 'd');
    expect(history.getByType('QUERY')).toHaveLength(1);
    expect(history.getByType('DECISION')).toHaveLength(1);
  });

  it('should get interactions by role', () => {
    const history = new AIInteractionHistory('sess-1');
    history.recordInteraction('USER', 'QUERY', 'q');
    history.recordInteraction('AI', 'RESPONSE', 'r');
    expect(history.getByRole('USER')).toHaveLength(1);
    expect(history.getByRole('AI')).toHaveLength(1);
  });

  it('should get conversation thread', () => {
    const history = new AIInteractionHistory('sess-1');
    const parent = history.recordInteraction('USER', 'QUERY', 'hello');
    history.recordInteraction('AI', 'RESPONSE', 'world', 'gpt-4', parent.id);
    const thread = history.getConversationThread(parent.id);
    expect(thread).toHaveLength(2);
  });

  it('should return empty thread for non-existent parent', () => {
    const history = new AIInteractionHistory('sess-1');
    expect(history.getConversationThread('nonexistent')).toEqual([]);
  });

  it('should get latest interaction', () => {
    const history = new AIInteractionHistory('sess-1');
    expect(history.getLatestInteraction()).toBeUndefined();
    history.recordInteraction('USER', 'QUERY', 'a');
    const last = history.recordInteraction('AI', 'RESPONSE', 'b');
    expect(history.getLatestInteraction()?.id).toBe(last.id);
  });

  it('should compute content hash', () => {
    const history = new AIInteractionHistory('sess-1');
    const hash = history.computeContentHash('test content');
    expect(hash).toHaveLength(64);
  });

  it('should serialize and deserialize', () => {
    const history = new AIInteractionHistory('sess-1');
    history.recordInteraction('USER', 'QUERY', 'hello');
    const json = history.toJSON();
    const restored = AIInteractionHistory.fromJSON(json);
    expect(restored.getInteractionCount()).toBe(1);
  });
});

describe('ReasoningChain', () => {
  const chain = new ReasoningChain();

  it('should build chains from interactions', () => {
    const a = makeInteraction('a', { sequenceNumber: 1 });
    const b = makeInteraction('b', { sequenceNumber: 2, parentInteractionId: 'a' });
    const chains = chain.buildChain([a, b]);
    expect(chains).toHaveLength(1);
    expect(chains[0]!).toHaveLength(2);
  });

  it('should get chain for specific interaction', () => {
    const a = makeInteraction('a', { sequenceNumber: 1 });
    const b = makeInteraction('b', { sequenceNumber: 2, parentInteractionId: 'a' });
    const result = chain.getChainForInteraction('a', [a, b]);
    expect(result).toHaveLength(2);
  });

  it('should return empty for non-existent interaction', () => {
    expect(chain.getChainForInteraction('nonexistent', [])).toEqual([]);
  });

  it('should get reasoning path', () => {
    const a = makeInteraction('a', { sequenceNumber: 1, role: 'USER', interactionType: 'QUERY', content: 'hello' });
    const b = makeInteraction('b', { sequenceNumber: 2, role: 'AI', interactionType: 'RESPONSE', content: 'world' });
    const path = chain.getReasoningPath([a, b]);
    expect(path).toHaveLength(2);
    expect(path[0]?.role).toBe('USER');
  });

  it('should truncate long content preview', () => {
    const long = 'x'.repeat(200);
    const a = makeInteraction('a', { content: long });
    const path = chain.getReasoningPath([a]);
    expect(path[0]?.contentPreview).toHaveLength(103);
  });

  it('should summarize chain', () => {
    const a = makeInteraction('a', { role: 'USER', interactionType: 'QUERY' });
    const b = makeInteraction('b', { role: 'AI', interactionType: 'RESPONSE' });
    const summary = chain.summarizeChain([a, b]);
    expect(summary).toContain('Chain length: 2');
  });

  it('should return empty chain message', () => {
    expect(chain.summarizeChain([])).toBe('Empty chain');
  });

  it('should return chain length', () => {
    const a = makeInteraction('a');
    expect(chain.chainLength([a])).toBe(1);
  });

  it('should handle orphaned interactions', () => {
    const a = makeInteraction('a', { sequenceNumber: 1, parentInteractionId: 'nonexistent' });
    const b = makeInteraction('b', { sequenceNumber: 2 });
    const chains = chain.buildChain([a, b]);
    expect(chains.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ReasoningContext', () => {
  const ctx = new ReasoningContext();

  it('should build context with key findings', () => {
    const interactions = [
      makeInteraction('a', { interactionType: 'DECISION', content: 'Important decision line\nMore details' }),
      makeInteraction('b', { interactionType: 'HYPOTHESIS', content: 'Key hypothesis here' }),
    ];
    const result = ctx.buildContext('sess-1', interactions, [], []);
    expect(result.keyFindings.length).toBeGreaterThan(0);
  });

  it('should extract key findings', () => {
    const interactions = [
      makeInteraction('a', { interactionType: 'DECISION', content: 'This is an important decision about the investigation' }),
    ];
    const findings = ctx.extractKeyFindings(interactions);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain('important decision');
  });

  it('should return empty findings for no decisions', () => {
    const interactions = [makeInteraction('a', { interactionType: 'QUERY', content: 'hi' })];
    const findings = ctx.extractKeyFindings(interactions);
    expect(findings).toEqual([]);
  });

  it('should get context window', () => {
    const interactions = Array.from({ length: 20 }, (_, i) =>
      makeInteraction(`int-${i}`, { sequenceNumber: i + 1 }),
    );
    const window = ctx.getContextWindow(interactions, 10);
    expect(window).toHaveLength(10);
    expect(window[0]?.id).toBe('int-10');
  });

  it('should return all interactions if under window size', () => {
    const interactions = [makeInteraction('a')];
    expect(ctx.getContextWindow(interactions, 10)).toHaveLength(1);
  });

  it('should compress context', () => {
    const interactions = Array.from({ length: 20 }, (_, i) =>
      makeInteraction(`int-${i}`, { sequenceNumber: i + 1 }),
    );
    const context = ctx.buildContext('sess-1', interactions, [], []);
    const compressed = ctx.compressContext(context);
    expect(compressed.compressed).toBe(true);
    expect(compressed.interactions.length).toBeLessThan(20);
  });

  it('should expand context with missing interactions', () => {
    const existing = [makeInteraction('a', { sequenceNumber: 1 })];
    const missing = [makeInteraction('b', { sequenceNumber: 2 })];
    const context = ctx.buildContext('sess-1', existing, [], []);
    const expanded = ctx.expandContext(context, missing);
    expect(expanded.interactions).toHaveLength(2);
    expect(expanded.compressed).toBe(false);
  });
});

describe('compression', () => {
  it('should compress filler interactions', () => {
    const interactions = [
      makeInteraction('a', { content: 'ok' }),
      makeInteraction('b', { content: 'important decision', interactionType: 'DECISION' }),
    ];
    const compressed = compressInteractions(interactions);
    expect(compressed).toHaveLength(1);
  });

  it('should detect redundant interactions', () => {
    const interactions = [
      makeInteraction('a', { role: 'AI', interactionType: 'RESPONSE', content: 'same' }),
      makeInteraction('b', { role: 'USER', interactionType: 'RESPONSE', content: 'same' }),
    ];
    const compressed = compressInteractions(interactions);
    expect(compressed.length).toBeLessThanOrEqual(2);
  });

  it('should decompress interactions as copy', () => {
    const interactions = [makeInteraction('a')];
    const decompressed = decompressInteractions(interactions);
    expect(decompressed).toHaveLength(1);
    expect(decompressed).toEqual(interactions);
  });

  it('should summarize interactions', () => {
    const interactions = [
      makeInteraction('a', { role: 'USER', interactionType: 'DECISION' }),
    ];
    const summary = summarizeInteractions(interactions);
    expect(summary).toContain('Total: 1');
  });

  it('should extract key decisions', () => {
    const interactions = [
      makeInteraction('a', { interactionType: 'DECISION', content: 'key decision' }),
      makeInteraction('b', { interactionType: 'QUERY', content: 'ok' }),
      makeInteraction('c', { interactionType: 'DECISION', content: 'critical path decision' }),
    ];
    const decisions = extractKeyDecisions(interactions);
    expect(decisions).toHaveLength(2);
  });
});

describe('query', () => {
  const interactions = [
    makeInteraction('a', { interactionType: 'DECISION', role: 'AI', content: 'decision text', modelId: 'gpt-4', createdAt: '2024-01-01T00:00:00Z' }),
    makeInteraction('b', { interactionType: 'QUERY', role: 'USER', content: 'user query', modelId: 'claude', createdAt: '2024-01-02T00:00:00Z' }),
    makeInteraction('c', { interactionType: 'HYPOTHESIS', role: 'AI', content: 'hypothesis text', modelId: 'gpt-4', createdAt: '2024-01-03T00:00:00Z' }),
  ];

  it('should filter by type', () => {
    const result = queryInteractions(interactions, { types: ['DECISION'] });
    expect(result).toHaveLength(1);
  });

  it('should filter by role', () => {
    const result = queryInteractions(interactions, { roles: ['USER'] });
    expect(result).toHaveLength(1);
  });

  it('should filter by date range', () => {
    const result = queryInteractions(interactions, { dateFrom: '2024-01-02T00:00:00Z', dateTo: '2024-01-03T00:00:00Z' });
    expect(result).toHaveLength(2);
  });

  it('should filter by keywords', () => {
    const result = queryInteractions(interactions, { keywords: ['decision'] });
    expect(result).toHaveLength(1);
  });

  it('should filter by modelId', () => {
    const result = queryInteractions(interactions, { modelId: 'claude' });
    expect(result).toHaveLength(1);
  });

  it('should search interactions by string', () => {
    const result = searchInteractions(interactions, 'hypothesis');
    expect(result).toHaveLength(1);
  });

  it('should return empty for empty search query', () => {
    expect(searchInteractions(interactions, '')).toEqual([]);
  });

  it('should find related interactions', () => {
    const parent = makeInteraction('parent', { sequenceNumber: 1 });
    const child = makeInteraction('child', { sequenceNumber: 2, parentInteractionId: 'parent' });
    const related = findRelatedInteractions('parent', [parent, child]);
    expect(related).toHaveLength(2);
  });

  it('should return empty for non-existent interaction in findRelated', () => {
    expect(findRelatedInteractions('nonexistent', [])).toEqual([]);
  });

  it('should get interactions by model', () => {
    const result = getInteractionsByModel(interactions, 'gpt-4');
    expect(result).toHaveLength(2);
  });

  it('should return empty for non-matching model', () => {
    expect(getInteractionsByModel(interactions, 'unknown')).toEqual([]);
  });
});
