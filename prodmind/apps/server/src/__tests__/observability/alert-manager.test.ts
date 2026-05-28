import { describe, it, expect } from 'vitest';
import { AlertManager } from '../../observability/alerts/alert-manager.ts';

describe('AlertManager', () => {
  it('raises alerts', () => {
    const a = new AlertManager();
    const alert = a.raise('warning', 'runtime', 'High memory');
    expect(alert.severity).toBe('warning');
    expect(alert.message).toBe('High memory');
  });

  it('acknowledges alerts', () => {
    const a = new AlertManager();
    const alert = a.raise('critical', 'runtime', 'Crash');
    a.acknowledge(alert.id);
    expect(a.getUnacknowledged().length).toBe(0);
  });
});
