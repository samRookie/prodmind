import { describe, it, expect } from 'vitest';
import { IngestionService } from '../ingestion.service.ts';
import type { Database } from '@prodmind/db';

function mockDb(): Database {
  return {} as unknown as Database;
}

describe('IngestionService', () => {
  it('can be instantiated', () => {
    const service = new IngestionService(mockDb());
    expect(service).toBeInstanceOf(IngestionService);
  });

  it('exposes ingest method', () => {
    const service = new IngestionService(mockDb());
    expect(typeof service.ingest).toBe('function');
  });

  it('ingest has three parameters', () => {
    const service = new IngestionService(mockDb());
    expect(service.ingest.length).toBe(3);
  });
});
