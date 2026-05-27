import { describe, expect, it, beforeEach } from 'vitest';
import { DeterministicClock } from '../determinism/clock.ts';
import { DeterministicIdGenerator } from '../determinism/id-generator.ts';
import { DeterminismAuditor } from '../determinism/auditor.ts';
import { NonDeterminismDetector } from '../determinism/detector.ts';

describe('DeterministicClock', () => {
  it('returns a number from now()', () => {
    expect(typeof DeterministicClock.now()).toBe('number');
  });

  it('setTime makes now() return the given time', () => {
    DeterministicClock.setTime(42_000);
    expect(DeterministicClock.now()).toBe(42_000);
    DeterministicClock.resetToSystemTime();
  });

  it('advance progresses time', () => {
    DeterministicClock.resetToSystemTime();
    const before = DeterministicClock.now();
    DeterministicClock.advance(1000);
    expect(DeterministicClock.now()).toBeGreaterThanOrEqual(before + 1000);
    DeterministicClock.resetToSystemTime();
  });

  it('freeze stops time progression', () => {
    DeterministicClock.freeze();
    const t1 = DeterministicClock.now();
    const t2 = DeterministicClock.now();
    expect(t1).toBe(t2);
    expect(DeterministicClock.isFrozen()).toBe(true);
    DeterministicClock.unfreeze();
    expect(DeterministicClock.isFrozen()).toBe(false);
  });

  it('unfreeze resumes time progression', () => {
    DeterministicClock.resetToSystemTime();
    DeterministicClock.freeze();
    DeterministicClock.unfreeze();
    const t1 = DeterministicClock.now();
    const t2 = DeterministicClock.now();
    // after unfreeze time should progress normally
    expect(t2).toBeGreaterThanOrEqual(t1);
  });

  it('resetToSystemTime restores system clock', () => {
    DeterministicClock.setTime(100);
    expect(DeterministicClock.now()).toBe(100);
    DeterministicClock.resetToSystemTime();
    expect(DeterministicClock.now()).not.toBe(100);
  });
});

describe('DeterministicIdGenerator', () => {
  it('generates sequential IDs', () => {
    const gen = new DeterministicIdGenerator();
    expect(gen.next()).toBe('id_1');
    expect(gen.next()).toBe('id_2');
    expect(gen.next('task')).toBe('task_3');
  });

  it('returns stable IDs for same key', () => {
    const gen = new DeterministicIdGenerator();
    const a = gen.nextStable('hello');
    const b = gen.nextStable('hello');
    expect(a).toBe(b);
  });

  it('stable IDs differ for different keys', () => {
    const gen = new DeterministicIdGenerator();
    const a = gen.nextStable('foo');
    const b = gen.nextStable('bar');
    expect(a).not.toBe(b);
  });

  it('seed-based determinism produces same sequence', () => {
    const gen1 = new DeterministicIdGenerator('seed42');
    const gen2 = new DeterministicIdGenerator('seed42');
    expect(gen1.next()).toBe(gen2.next());
    expect(gen1.next('x')).toBe(gen2.next('x'));
  });

  it('setCounter and getCounter', () => {
    const gen = new DeterministicIdGenerator();
    gen.setCounter(100);
    expect(gen.getCounter()).toBe(100);
    expect(gen.next()).toBe('id_101');
  });

  it('reset clears state', () => {
    const gen = new DeterministicIdGenerator('s');
    gen.next();
    gen.next();
    gen.reset();
    expect(gen.getCounter()).toBe(0);
  });
});

describe('DeterminismAuditor', () => {
  let auditor: DeterminismAuditor;

  beforeEach(() => {
    auditor = new DeterminismAuditor();
  });

  it('records fingerprints', () => {
    auditor.recordFingerprint('op1', 'abc');
    const report = auditor.getAuditReport();
    expect(report.totalOperations).toBe(1);
    expect(report.consistentCount).toBe(1);
  });

  it('verifyConsistency returns true for first recording', () => {
    expect(auditor.verifyConsistency('op1', 'abc')).toBe(true);
  });

  it('verifyConsistency returns true when fingerprints match', () => {
    auditor.recordFingerprint('op1', 'abc');
    expect(auditor.verifyConsistency('op1', 'abc')).toBe(true);
  });

  it('verifyConsistency returns false when fingerprints diverge', () => {
    auditor.recordFingerprint('op1', 'abc');
    expect(auditor.verifyConsistency('op1', 'xyz')).toBe(false);
  });

  it('getAuditReport returns report structure', () => {
    auditor.recordFingerprint('a', '1');
    auditor.recordFingerprint('b', '2');
    const report = auditor.getAuditReport();
    expect(report.totalOperations).toBe(2);
    expect(report.consistentCount).toBe(2);
    expect(report.divergentCount).toBe(0);
    expect(Array.isArray(report.divergences)).toBe(true);
  });

  it('reset clears all records', () => {
    auditor.recordFingerprint('a', '1');
    auditor.reset();
    expect(auditor.getAuditReport().totalOperations).toBe(0);
  });

  it('clear with operationId removes single record', () => {
    auditor.recordFingerprint('a', '1');
    auditor.recordFingerprint('b', '2');
    auditor.clear('a');
    expect(auditor.getAuditReport().totalOperations).toBe(1);
  });

  it('clear without operationId removes all', () => {
    auditor.recordFingerprint('a', '1');
    auditor.clear();
    expect(auditor.getAuditReport().totalOperations).toBe(0);
  });
});

describe('NonDeterminismDetector', () => {
  it('detects Date.now() as high risk', () => {
    const results = NonDeterminismDetector.checkSourceCode('const x = Date.now();');
    expect(results.length).toBeGreaterThanOrEqual(1);
    const dateNow = results.find(r => r.pattern === 'Date.now()');
    expect(dateNow).toBeDefined();
    expect(dateNow!.risk).toBe('high');
  });

  it('detects Math.random() as high risk', () => {
    const results = NonDeterminismDetector.checkSourceCode('const r = Math.random();');
    expect(results.some(r => r.pattern === 'Math.random()')).toBe(true);
  });

  it('detects new Date() as high risk', () => {
    const results = NonDeterminismDetector.checkSourceCode('const d = new Date();');
    expect(results.some(r => r.pattern === 'new Date()')).toBe(true);
  });

  it('detects performance.now() and crypto.randomUUID() as high risk', () => {
    const results = NonDeterminismDetector.checkSourceCode(`
      const p = performance.now();
      const u = crypto.randomUUID();
    `);
    expect(results.some(r => r.pattern === 'performance.now()')).toBe(true);
    expect(results.some(r => r.pattern === 'crypto.randomUUID()')).toBe(true);
  });

  it('detects Object.keys() as medium risk', () => {
    const results = NonDeterminismDetector.checkSourceCode('const k = Object.keys(obj);');
    expect(results.some(r => r.pattern === 'Object.keys() (unordered)' && r.risk === 'medium')).toBe(true);
  });

  it('detects for...in as medium risk', () => {
    const results = NonDeterminismDetector.checkSourceCode('for (const k in obj) {}');
    expect(results.some(r => r.pattern === 'for...in (iteration order)' && r.risk === 'medium')).toBe(true);
  });

  it('returns correct line numbers', () => {
    const results = NonDeterminismDetector.checkSourceCode(
      'const a = 1;\nconst b = Date.now();\nconst c = Math.random();'
    );
    const dateNow = results.find(r => r.pattern === 'Date.now()');
    expect(dateNow!.line).toBe(2);
    const mathRand = results.find(r => r.pattern === 'Math.random()');
    expect(mathRand!.line).toBe(3);
  });

  it('analyzeOrdering returns true for sorted keys', () => {
    expect(NonDeterminismDetector.analyzeOrdering(['a', 'b', 'c'])).toBe(true);
  });

  it('analyzeOrdering returns false for unsorted keys', () => {
    expect(NonDeterminismDetector.analyzeOrdering(['c', 'a', 'b'])).toBe(false);
  });

  it('analyzeOrdering returns true for empty/single arrays', () => {
    expect(NonDeterminismDetector.analyzeOrdering([])).toBe(true);
    expect(NonDeterminismDetector.analyzeOrdering(['a'])).toBe(true);
  });

  it('isSortingStable returns true for stable sorts', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    expect(NonDeterminismDetector.isSortingStable(items, x => x.name)).toBe(true);
  });

  it('checkExecutionEnv returns readonly array', () => {
    const results = NonDeterminismDetector.checkExecutionEnv();
    expect(Array.isArray(results)).toBe(true);
  });
});
