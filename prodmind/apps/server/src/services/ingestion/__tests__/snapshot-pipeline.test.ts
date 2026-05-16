import { describe, it, expect, beforeEach } from 'vitest';
import type { Database } from '@prodmind/db';
import { SnapshotPipeline } from '../snapshot-pipeline.ts';

function mockDb(): Database {
  return {} as unknown as Database;
}

describe('SnapshotPipeline', () => {
  let pipeline: SnapshotPipeline;

  beforeEach(() => {
    pipeline = new SnapshotPipeline(mockDb());
  });

  it('can be instantiated', () => {
    expect(pipeline).toBeInstanceOf(SnapshotPipeline);
  });

  it('exposes a createSnapshot method', () => {
    expect(typeof pipeline.createSnapshot).toBe('function');
  });

  it('exposes a transitionTo method', () => {
    expect(typeof pipeline.transitionTo).toBe('function');
  });

  it('exposes a markFailed method', () => {
    expect(typeof pipeline.markFailed).toBe('function');
  });

  it('exposes a markDegraded method', () => {
    expect(typeof pipeline.markDegraded).toBe('function');
  });

  it('exposes a commitGraph method', () => {
    expect(typeof pipeline.commitGraph).toBe('function');
  });

  it('exposes an activateSnapshot method', () => {
    expect(typeof pipeline.activateSnapshot).toBe('function');
  });

  it('exposes a rollbackSnapshot method', () => {
    expect(typeof pipeline.rollbackSnapshot).toBe('function');
  });

  it('exposes a findById method', () => {
    expect(typeof pipeline.findById).toBe('function');
  });

  it('can be constructed without error', () => {
    expect(() => new SnapshotPipeline(mockDb())).not.toThrow();
  });
});
