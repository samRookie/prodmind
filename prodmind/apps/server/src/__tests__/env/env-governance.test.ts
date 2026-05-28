import { describe, it, expect, vi } from 'vitest';
import { EnvGovernance } from '../../env/env-governance.ts';

describe('EnvGovernance', () => {
  it('initializes and generates report', () => {
    const g = new EnvGovernance();
    const env = g.initialize();
    expect(env).toBeTruthy();
    expect(g.report.loaded).toBe(true);
  });

  it('report contains mode and snapshot', () => {
    vi.stubEnv('NODE_ENV', '');
    const g = new EnvGovernance();
    g.initialize();
    expect(g.report.mode).toBe('development');
    expect(g.report.snapshot).toBeTruthy();
    vi.unstubAllEnvs();
  });

  it('validate returns true for dev', () => {
    const g = new EnvGovernance();
    g.initialize();
    expect(g.validate()).toBe(true);
  });
});
