import { describe, expect, it, beforeEach } from 'vitest';

import { ReasoningChain, chainResultToMemoryEntry } from '../reasoning/reasoning-chain.ts';
import type { ChainResult } from '../reasoning/reasoning-chain.ts';
import { ArchitecturalInference } from '../reasoning/architectural-inference.ts';
import type { InferenceRule } from '../reasoning/architectural-inference.ts';
import { ImpactReasoning } from '../reasoning/impact-reasoning.ts';
import { DependencyReasoning } from '../reasoning/dependency-reasoning.ts';
import { VolatilityReasoning } from '../reasoning/volatility-reasoning.ts';
import { DependencyIndexer } from '../indexing/dependency-indexer.ts';
import { MetricsIndexer } from '../indexing/metrics-indexer.ts';
import type { MemoryEntry, ArchitecturalFinding, MemoryRelation, MetricsMemory } from '../contracts/memory-contracts.ts';

/* -------------------------------------------------------------------- */
/*  ReasoningChain + chainResultToMemoryEntry                            */
/* -------------------------------------------------------------------- */
describe('ReasoningChain', () => {
  it('constructor sets chainType', () => {
    const chain = new ReasoningChain('cyclic_dependency');
    expect(chain.chainType).toBe('cyclic_dependency');
  });

  it('starts with 0 steps', () => {
    const chain = new ReasoningChain('test');
    expect(chain.stepCount).toBe(0);
    expect(chain.steps).toEqual([]);
  });

  it('addStep creates a ReasoningStep with sequential stepIndex', () => {
    const chain = new ReasoningChain('test');
    const step0 = chain.addStep('first', ['e1'], 0.8);
    expect(step0.stepIndex).toBe(0);
    expect(step0.description).toBe('first');
    expect(step0.evidenceIds).toEqual(['e1']);
    expect(step0.confidence).toBe(0.8);

    const step1 = chain.addStep('second', ['e2'], 0.9);
    expect(step1.stepIndex).toBe(1);
    expect(chain.stepCount).toBe(2);
  });

  it('addStep returns a frozen step', () => {
    const chain = new ReasoningChain('test');
    const step = chain.addStep('frozen', [], 1.0);
    expect(Object.isFrozen(step)).toBe(true);
  });

  it('build returns ChainResult with chainId, avg confidence, fingerprint, frozen steps', () => {
    const chain = new ReasoningChain('cyclic_dependency');
    chain.addStep('found cycle', ['n1', 'n2'], 0.8);
    chain.addStep('traced path', ['n3'], 0.9);

    const result = chain.build('Detected cyclic dependency');
    expect(result.chainId).toBeDefined();
    expect(result.chainId).toMatch(/^chain_\d+$/);
    expect(result.chainType).toBe('cyclic_dependency');
    expect(result.steps).toHaveLength(2);
    expect(result.conclusion).toBe('Detected cyclic dependency');
    expect(result.confidence).toBeCloseTo(0.85, 5);
    expect(result.fingerprint).toBeDefined();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.steps)).toBe(true);
  });

  it('build with no steps returns 0 confidence', () => {
    const chain = new ReasoningChain('empty');
    const result = chain.build('nothing to report');
    expect(result.steps).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  it('build generates unique chainId on each call', () => {
    const chain = new ReasoningChain('test');
    chain.addStep('step', [], 0.5);
    const r1 = chain.build('a');
    const r2 = chain.build('b');
    expect(r1.chainId).not.toBe(r2.chainId);
  });

  it('steps returns frozen array', () => {
    const chain = new ReasoningChain('test');
    chain.addStep('step', [], 0.5);
    const steps = chain.steps;
    expect(Object.isFrozen(steps)).toBe(true);
  });

  it('clear resets steps', () => {
    const chain = new ReasoningChain('test');
    chain.addStep('step', [], 0.5);
    expect(chain.stepCount).toBe(1);
    chain.clear();
    expect(chain.stepCount).toBe(0);
    expect(chain.steps).toEqual([]);
  });
});

describe('chainResultToMemoryEntry', () => {
  it('converts ChainResult to MemoryEntry with category architectural', () => {
    const chain = new ReasoningChain('cyclic_dependency');
    chain.addStep('found cycle', ['n1'], 0.9);
    const result = chain.build('Detected cycle');

    const entry = chainResultToMemoryEntry(result);
    expect(entry.id).toBe(result.chainId);
    expect(entry.category).toBe('architectural');
    expect(entry.content).toBe(result.conclusion);
    expect(entry.fingerprint).toBe(result.fingerprint);
    expect(entry.timestamp).toBe('');
    expect(entry.metadata.chainType).toBe(result.chainType);
    expect(entry.metadata.stepCount).toBe('1');
    expect(entry.metadata.confidence).toBe('0.9');
    expect(entry.tags).toContain('cyclic_dependency');
    expect(entry.tags).toContain('n1');
    expect(entry.provenanceId).toBe('');
    expect(entry.parentId).toBe('');
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it('preserves all evidence IDs in tags', () => {
    const chain = new ReasoningChain('test');
    chain.addStep('step1', ['a', 'b'], 0.5);
    chain.addStep('step2', ['c'], 0.5);
    const entry = chainResultToMemoryEntry(chain.build('done'));
    expect(entry.tags).toEqual(expect.arrayContaining(['test', 'a', 'b', 'c']));
  });
});

/* -------------------------------------------------------------------- */
/*  ArchitecturalInference                                                */
/* -------------------------------------------------------------------- */
describe('ArchitecturalInference', () => {
  let inference: ArchitecturalInference;

  beforeEach(() => {
    inference = new ArchitecturalInference();
  });

  it('starts with empty rules', () => {
    expect(inference.rules).toEqual([]);
  });

  it('addRule adds a rule', () => {
    const rule: InferenceRule = {
      pattern: 'high_fan_out',
      condition: () => true,
      conclusion: 'High fan-out detected',
    };
    inference.addRule(rule);
    expect(inference.rules).toHaveLength(1);
    expect(inference.rules[0]!.pattern).toBe('high_fan_out');
  });

  it('infer applies rules and returns chain results for matching conditions', () => {
    const rule: InferenceRule = {
      pattern: 'always_match',
      condition: () => true,
      conclusion: 'Matched',
    };
    inference.addRule(rule);
    const results = inference.infer([], []);
    expect(results).toHaveLength(1);
    expect(results[0]!.conclusion).toBe('Matched');
    expect(results[0]!.chainType).toBe('architectural_drift');
    expect(results[0]!.steps).toHaveLength(1);
    expect(Object.isFrozen(results)).toBe(true);
  });

  it('infer returns empty array when no rules match', () => {
    const rule: InferenceRule = {
      pattern: 'never_match',
      condition: () => false,
      conclusion: 'Nope',
    };
    inference.addRule(rule);
    const results = inference.infer([], []);
    expect(results).toEqual([]);
  });

  it('infer passes entries and findings to condition', () => {
    const ids: string[] = [];
    const rule: InferenceRule = {
      pattern: 'capture',
      condition: (entries, findings) => {
        ids.push(...entries.map(e => e.id), ...findings.map(f => f.id));
        return true;
      },
      conclusion: 'Captured',
    };
    inference.addRule(rule);
    const entry = Object.freeze<MemoryEntry>({
      id: 'e1', category: 'architectural', timestamp: '', content: '',
      fingerprint: '', metadata: Object.freeze({}), tags: Object.freeze([]),
      provenanceId: '', parentId: '',
    });
    const finding = Object.freeze<ArchitecturalFinding>({
      id: 'f1', findingType: '', label: '', description: '', severity: '',
      affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]),
      timestamp: '', fingerprint: '',
    });
    inference.infer([entry], [finding]);
    expect(ids).toEqual(['e1', 'f1']);
  });

  it('inferDensityChange returns chain when growth present', () => {
    const result = inference.inferDensityChange(5, 10, 3, 15);
    expect(result).toBeDefined();
    expect(result!.chainType).toBe('architectural_drift');
    expect(result!.steps).toHaveLength(2);
    expect(result!.conclusion).toContain('High connectivity growth');
  });

  it('inferDensityChange returns chain with proportional conclusion when ratio <= 2', () => {
    const result = inference.inferDensityChange(5, 10, 3, 6);
    expect(result).toBeDefined();
    expect(result!.conclusion).toContain('proportional');
  });

  it('inferDensityChange returns undefined when no growth', () => {
    expect(inference.inferDensityChange(10, 5, 10, 3)).toBeUndefined();
    expect(inference.inferDensityChange(5, 5, 5, 5)).toBeUndefined();
    expect(inference.inferDensityChange(10, 5, 3, 1)).toBeUndefined();
  });

  it('inferHotspot detects tags above threshold', () => {
    const entry = (id: string, tags: readonly string[]): MemoryEntry =>
      Object.freeze<MemoryEntry>({
        id, category: 'architectural', timestamp: '', content: '',
        fingerprint: '', metadata: Object.freeze({}), tags,
        provenanceId: '', parentId: '',
      });
    const entries = [
      entry('a', ['api', 'critical']),
      entry('b', ['api', 'auth']),
      entry('c', ['api']),
    ];
    const results = inference.inferHotspot(entries, 2);
    expect(results.length).toBeGreaterThanOrEqual(1);
    const tagResult = results.find(r => r.conclusion.includes('"api"'));
    expect(tagResult).toBeDefined();
    expect(tagResult!.steps[0]!.description).toContain('api');
    expect(Object.isFrozen(results)).toBe(true);
  });

  it('inferHotspot returns empty when no tags meet threshold', () => {
    const entry = (id: string, tags: readonly string[]): MemoryEntry =>
      Object.freeze<MemoryEntry>({
        id, category: 'architectural', timestamp: '', content: '',
        fingerprint: '', metadata: Object.freeze({}), tags,
        provenanceId: '', parentId: '',
      });
    const results = inference.inferHotspot([entry('a', ['rare'])], 5);
    expect(results).toEqual([]);
  });

  it('rules returns frozen array', () => {
    inference.addRule({ pattern: 'p', condition: () => true, conclusion: 'c' });
    const rules = inference.rules;
    expect(Object.isFrozen(rules)).toBe(true);
  });

  it('clear removes all rules', () => {
    inference.addRule({ pattern: 'p', condition: () => true, conclusion: 'c' });
    expect(inference.rules).toHaveLength(1);
    inference.clear();
    expect(inference.rules).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------- */
/*  ImpactReasoning                                                       */
/* -------------------------------------------------------------------- */
describe('ImpactReasoning', () => {
  let indexer: DependencyIndexer;
  let reasoning: ImpactReasoning;

  beforeEach(() => {
    indexer = new DependencyIndexer();
    const r1: MemoryRelation = Object.freeze({ sourceId: 'a', targetId: 'b', relationType: 'depends', weight: 1, timestamp: '' });
    const r2: MemoryRelation = Object.freeze({ sourceId: 'a', targetId: 'c', relationType: 'depends', weight: 1, timestamp: '' });
    const r3: MemoryRelation = Object.freeze({ sourceId: 'b', targetId: 'a', relationType: 'depends', weight: 1, timestamp: '' });
    indexer.indexRelation(r1);
    indexer.indexRelation(r2);
    indexer.indexRelation(r3);
    reasoning = new ImpactReasoning(indexer);
  });

  it('constructor takes DependencyIndexer', () => {
    expect(reasoning).toBeInstanceOf(ImpactReasoning);
  });

  it('analyzeImpact creates chain with steps about fan-in, fan-out, instability', () => {
    const result = reasoning.analyzeImpact('a', []);
    expect(result.chainType).toBe('dependency_impact');
    expect(result.steps).toHaveLength(5);
    expect(result.conclusion).toContain('"a"');
    expect(result.conclusion).toContain('fan-out');
  });

  it('analyzeImpact produces high-risk conclusion when fanOut > 10 and instability > 0.7', () => {
    for (let i = 0; i < 11; i++) {
      indexer.indexRelation(Object.freeze({ sourceId: 'x', targetId: `dep_${i}`, relationType: 'depends', weight: 1, timestamp: '' }));
    }
    const localIdx = new DependencyIndexer();
    localIdx.indexRelation(Object.freeze({ sourceId: 'risk', targetId: 'other', relationType: 'depends', weight: 1, timestamp: '' }));
    for (let i = 0; i < 11; i++) {
      localIdx.indexRelation(Object.freeze({ sourceId: 'risk', targetId: `d${i}`, relationType: 'depends', weight: 1, timestamp: '' }));
    }
    const ir = new ImpactReasoning(localIdx);
    const result = ir.analyzeImpact('risk', []);
    expect(result.conclusion).toContain('high-risk');
  });

  it('analyzeImpact produces widely-depended conclusion when fanIn > 10', () => {
    for (let i = 0; i < 11; i++) {
      indexer.indexRelation(Object.freeze({ sourceId: `s${i}`, targetId: 'hub', relationType: 'depends', weight: 1, timestamp: '' }));
    }
    const localIdx = new DependencyIndexer();
    for (let i = 0; i < 11; i++) {
      localIdx.indexRelation(Object.freeze({ sourceId: `s${i}`, targetId: 'hub', relationType: 'depends', weight: 1, timestamp: '' }));
    }
    const ir = new ImpactReasoning(localIdx);
    const result = ir.analyzeImpact('hub', []);
    expect(result.conclusion).toContain('widely depended');
  });

  it('analyzeImpact includes related memory entries', () => {
    // a depends on c, so entry with id 'c' should be found as related
    const indexer = new DependencyIndexer();
    indexer.indexRelation(Object.freeze({ sourceId: 'a', targetId: 'c', relationType: 'depends', weight: 1, timestamp: '' }));
    const ir = new ImpactReasoning(indexer);
    const entries: MemoryEntry[] = [
      Object.freeze<MemoryEntry>({ id: 'c', category: 'architectural', timestamp: '', content: '', fingerprint: '', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' }),
    ];
    const result = ir.analyzeImpact('a', entries);
    const step = result.steps.find(s => s.description.includes('memory'));
    expect(step).toBeDefined();
    expect(step!.evidenceIds).toContain('c');
  });

  it('analyzePropagationRisk traverses BFS and returns conclusion about risk level', () => {
    const result = reasoning.analyzePropagationRisk(['a'], 3);
    expect(result.chainType).toBe('propagation_risk');
    expect(result.conclusion).toContain('node');
    expect(result.steps).toHaveLength(3);
  });

  it('analyzePropagationRisk reports high risk when > 10 nodes affected', () => {
    const localIdx = new DependencyIndexer();
    for (let i = 1; i <= 12; i++) {
      // n_i depends on root, so getDependents('root') returns all n_i
      localIdx.indexRelation(Object.freeze({ sourceId: `n${i}`, targetId: 'root', relationType: 'depends', weight: 1, timestamp: '' }));
    }
    const ir = new ImpactReasoning(localIdx);
    const result = ir.analyzePropagationRisk(['root'], 1);
    expect(result.conclusion).toContain('High propagation risk');
  });
});

/* -------------------------------------------------------------------- */
/*  DependencyReasoning                                                   */
/* -------------------------------------------------------------------- */
describe('DependencyReasoning', () => {
  let indexer: DependencyIndexer;
  let reasoning: DependencyReasoning;

  beforeEach(() => {
    indexer = new DependencyIndexer();
    reasoning = new DependencyReasoning(indexer);
  });

  it('constructor takes DependencyIndexer', () => {
    expect(reasoning).toBeInstanceOf(DependencyReasoning);
  });

  it('findCycles detects cycles in dependency graph', () => {
    indexer.indexRelation(Object.freeze({ sourceId: 'a', targetId: 'b', relationType: 'depends', weight: 1, timestamp: '' }));
    indexer.indexRelation(Object.freeze({ sourceId: 'b', targetId: 'c', relationType: 'depends', weight: 1, timestamp: '' }));
    indexer.indexRelation(Object.freeze({ sourceId: 'c', targetId: 'a', relationType: 'depends', weight: 1, timestamp: '' }));
    const result = reasoning.findCycles(['a', 'b', 'c']);
    expect(result.chainType).toBe('cyclic_dependency');
    expect(result.conclusion).toContain('cyclic');
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
  });

  it('findCycles returns acyclic conclusion when no cycles', () => {
    indexer.indexRelation(Object.freeze({ sourceId: 'a', targetId: 'b', relationType: 'depends', weight: 1, timestamp: '' }));
    indexer.indexRelation(Object.freeze({ sourceId: 'b', targetId: 'c', relationType: 'depends', weight: 1, timestamp: '' }));
    const result = reasoning.findCycles(['a', 'b', 'c']);
    expect(result.conclusion).toBe('Dependency graph is acyclic — safe for topological processing');
    expect(result.steps).toHaveLength(2);
  });

  it('findCycles reports up to 5 cycles individually', () => {
    // a<->b, a<->c
    indexer.indexRelation(Object.freeze({ sourceId: 'a', targetId: 'b', relationType: 'depends', weight: 1, timestamp: '' }));
    indexer.indexRelation(Object.freeze({ sourceId: 'b', targetId: 'a', relationType: 'depends', weight: 1, timestamp: '' }));
    indexer.indexRelation(Object.freeze({ sourceId: 'a', targetId: 'c', relationType: 'depends', weight: 1, timestamp: '' }));
    indexer.indexRelation(Object.freeze({ sourceId: 'c', targetId: 'a', relationType: 'depends', weight: 1, timestamp: '' }));
    const result = reasoning.findCycles(['a', 'b', 'c']);
    expect(result.conclusion).toContain('cyclic');
  });

  it('analyzeStability reports instability distribution', () => {
    indexer.indexRelation(Object.freeze({ sourceId: 'a', targetId: 'b', relationType: 'depends', weight: 1, timestamp: '' }));
    indexer.indexRelation(Object.freeze({ sourceId: 'b', targetId: 'c', relationType: 'depends', weight: 1, timestamp: '' }));
    const result = reasoning.analyzeStability(['a', 'b', 'c']);
    expect(result.chainType).toBe('instability_escalation');
    expect(result.conclusion).toMatch(/Average instability: \d+\.\d+/);
    expect(result.steps.length).toBeGreaterThanOrEqual(2);
  });

  it('analyzeStability identifies unstable nodes', () => {
    indexer.indexRelation(Object.freeze({ sourceId: 'a', targetId: 'b', relationType: 'depends', weight: 1, timestamp: '' }));
    indexer.indexRelation(Object.freeze({ sourceId: 'a', targetId: 'c', relationType: 'depends', weight: 1, timestamp: '' }));
    indexer.indexRelation(Object.freeze({ sourceId: 'a', targetId: 'd', relationType: 'depends', weight: 1, timestamp: '' }));
    indexer.indexRelation(Object.freeze({ sourceId: 'a', targetId: 'e', relationType: 'depends', weight: 1, timestamp: '' }));
    // a has fanOut=4, fanIn=0 => instability 1.0 > 0.5 => avg=1.0 triggers 'instability risk'
    const result = reasoning.analyzeStability(['a']);
    expect(result.conclusion).toContain('instability risk');
  });
});

/* -------------------------------------------------------------------- */
/*  VolatilityReasoning                                                   */
/* -------------------------------------------------------------------- */
describe('VolatilityReasoning', () => {
  let indexer: MetricsIndexer;
  let reasoning: VolatilityReasoning;

  beforeEach(() => {
    indexer = new MetricsIndexer();
    reasoning = new VolatilityReasoning(indexer);
  });

  it('constructor takes MetricsIndexer', () => {
    expect(reasoning).toBeInstanceOf(VolatilityReasoning);
  });

  it('analyzeVolatility returns insufficient data when <2 history points', () => {
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's1', instability: 0.5,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't1',
    }));
    const result = reasoning.analyzeVolatility('m1');
    expect(result.conclusion).toContain('insufficient data');
    expect(result.steps).toHaveLength(2);
  });

  it('analyzeVolatility computes instability trend when sufficient history', () => {
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's1', instability: 0.2,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't1',
    }));
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's2', instability: 0.8,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't2',
    }));
    const result = reasoning.analyzeVolatility('m1');
    expect(result.chainType).toBe('instability_escalation');
    expect(result.conclusion).toContain('m1');
    expect(result.steps.length).toBeGreaterThanOrEqual(3);
    expect(result.conclusion).toMatch(/high volatility|becoming increasingly unstable|stable/);
  });

  it('analyzeVolatility reports high volatility when maxDelta > 0.3', () => {
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's1', instability: 0.1,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't1',
    }));
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's2', instability: 0.9,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't2',
    }));
    const result = reasoning.analyzeVolatility('m1');
    expect(result.conclusion).toContain('high volatility');
  });

  it('analyzeVolatility reports stabilizing when delta < -0.1', () => {
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's1', instability: 0.5,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't1',
    }));
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's2', instability: 0.4,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't2',
    }));
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's3', instability: 0.3,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't3',
    }));
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's4', instability: 0.2,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't4',
    }));
    // delta = 0.2 - 0.5 = -0.3 < -0.1, maxDelta = 0.1 <= 0.3
    const result = reasoning.analyzeVolatility('m1');
    expect(result.conclusion).toContain('stabilizing');
  });

  it('analyzeVolatility reports stable when delta is small', () => {
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's1', instability: 0.5,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't1',
    }));
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'm1', snapshotId: 's2', instability: 0.51,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't2',
    }));
    const result = reasoning.analyzeVolatility('m1');
    expect(result.conclusion).toContain('stable');
  });

  it('compareVolatility ranks nodes by volatility', () => {
    // node v1: high volatility
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'v1', snapshotId: 's1', instability: 0.1,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't1',
    }));
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'v1', snapshotId: 's2', instability: 0.9,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't2',
    }));
    // node v2: low volatility
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'v2', snapshotId: 's1', instability: 0.4,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't1',
    }));
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'v2', snapshotId: 's2', instability: 0.41,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't2',
    }));
    const result = reasoning.compareVolatility(['v1', 'v2']);
    expect(result.chainType).toBe('instability_escalation');
    expect(result.conclusion).toContain('v1');
    expect(result.conclusion).toContain('v2');
  });

  it('compareVolatility handles nodes with insufficient history', () => {
    indexer.index(Object.freeze<MetricsMemory>({
      id: 'lonely', snapshotId: 's1', instability: 0.5,
      propagationRisk: 0, fanInAvg: 0, fanOutAvg: 0, volatility: 0, timestamp: 't1',
    }));
    const result = reasoning.compareVolatility(['lonely']);
    expect(result.conclusion).toContain('lonely');
  });
});
