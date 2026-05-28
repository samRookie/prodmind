import { describe, it, expect } from 'vitest';
import { StructuredLogger } from '../../observability/logging/structured-logger.ts';

describe('StructuredLogger', () => {
  it('logs entries', () => {
    const l = new StructuredLogger('debug', 'json');
    l.info('test message');
    expect(l.getEntries().length).toBe(1);
  });

  it('respects log level', () => {
    const l = new StructuredLogger('warn', 'json');
    l.debug('should not appear');
    l.warn('should appear');
    expect(l.getEntries().length).toBe(1);
  });

  it('includes metadata', () => {
    const l = new StructuredLogger('info', 'json');
    l.info('test', { component: 'test', correlationId: '123' });
    const entry = l.getEntries()[0]!;
    expect(entry.component).toBe('test');
    expect(entry.correlationId).toBe('123');
  });

  it('clears entries', () => {
    const l = new StructuredLogger('info', 'json');
    l.info('test');
    l.clear();
    expect(l.getEntries().length).toBe(0);
  });
});
