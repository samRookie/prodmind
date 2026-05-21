import { describe, expect, it } from 'vitest';

import { ProviderTelemetryCollector } from '../telemetry/provider-telemetry.ts';

describe('ProviderTelemetryCollector', () => {
  describe('record', () => {
    it('records a telemetry event', () => {
      const t = new ProviderTelemetryCollector();
      const event = t.record({ type: 'request', provider: 'openai', model: 'gpt-4' });
      expect(event.type).toBe('request');
      expect(event.provider).toBe('openai');
      expect(event.model).toBe('gpt-4');
      expect(typeof event.timestamp).toBe('string');
    });

    it('enforces maxEvents limit', () => {
      const t = new ProviderTelemetryCollector({ maxEvents: 3 });
      t.record({ type: 'request', provider: 'a', model: 'm' });
      t.record({ type: 'request', provider: 'b', model: 'm' });
      t.record({ type: 'request', provider: 'c', model: 'm' });
      t.record({ type: 'request', provider: 'd', model: 'm' });
      expect(t.getEventCount()).toBe(3);
      expect(t.getEvents()[0]?.provider).toBe('b');
    });

    it('returns frozen event', () => {
      const t = new ProviderTelemetryCollector();
      const event = t.record({ type: 'selection', provider: 't', model: 'm' });
      expect(Object.isFrozen(event)).toBe(true);
    });
  });

  describe('convenience methods', () => {
    const t = new ProviderTelemetryCollector();

    it('recordSelection', () => {
      const e = t.recordSelection('o', 'gpt-4', 10);
      expect(e.type).toBe('selection');
    });

    it('recordRequest', () => {
      const e = t.recordRequest('o', 'gpt-4', 20);
      expect(e.type).toBe('request');
    });

    it('recordResponse', () => {
      const e = t.recordResponse('o', 'gpt-4', 30);
      expect(e.type).toBe('response');
    });

    it('recordFailure', () => {
      const e = t.recordFailure('o', 'gpt-4', 40);
      expect(e.type).toBe('failure');
    });

    it('recordReplay', () => {
      const e = t.recordReplay('o', 'gpt-4', 50);
      expect(e.type).toBe('replay');
    });

    it('recordGovernance', () => {
      const e = t.recordGovernance('o', 'gpt-4', 60);
      expect(e.type).toBe('governance');
    });
  });

  describe('getEvents', () => {
    it('filters by type', () => {
      const t = new ProviderTelemetryCollector();
      t.recordRequest('o', 'm');
      t.recordFailure('o', 'm');
      const failures = t.getEvents('failure');
      expect(failures).toHaveLength(1);
      expect(failures[0]?.type).toBe('failure');
    });

    it('returns all events when no type', () => {
      const t = new ProviderTelemetryCollector();
      t.recordRequest('o', 'm');
      t.recordFailure('o', 'm');
      expect(t.getEvents()).toHaveLength(2);
    });

    it('returns frozen array', () => {
      const t = new ProviderTelemetryCollector();
      t.recordRequest('o', 'm');
      expect(Object.isFrozen(t.getEvents())).toBe(true);
    });
  });

  describe('getEventCount', () => {
    it('counts all events', () => {
      const t = new ProviderTelemetryCollector();
      t.recordRequest('o', 'm');
      t.recordFailure('o', 'm');
      expect(t.getEventCount()).toBe(2);
    });

    it('counts by type', () => {
      const t = new ProviderTelemetryCollector();
      t.recordRequest('o', 'm');
      t.recordFailure('o', 'm');
      expect(t.getEventCount('request')).toBe(1);
    });
  });

  describe('clear', () => {
    it('removes all events', () => {
      const t = new ProviderTelemetryCollector();
      t.recordRequest('o', 'm');
      t.clear();
      expect(t.getEventCount()).toBe(0);
    });
  });

  describe('isEnabled', () => {
    it('returns true by default', () => {
      const t = new ProviderTelemetryCollector();
      expect(t.isEnabled()).toBe(true);
    });

    it('returns false when disabled', () => {
      const t = new ProviderTelemetryCollector({ enabled: false });
      expect(t.isEnabled()).toBe(false);
    });
  });
});
