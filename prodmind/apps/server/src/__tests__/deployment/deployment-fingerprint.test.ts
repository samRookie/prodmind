import { describe, it, expect } from 'vitest';
import { DeploymentFingerprint } from '../../deployment/deployment-fingerprint.ts';

describe('DeploymentFingerprint', () => {
  it('generates fingerprint', () => {
    const f = new DeploymentFingerprint();
    const fp = f.generate({ key: 'value' }, { pkg: '1.0.0' }, 'env-fp');
    expect(fp.config).toBeTruthy();
    expect(fp.packages).toBeTruthy();
    expect(fp.environment).toBe('env-fp');
    expect(fp.combined).toBeTruthy();
  });

  it('verifies fingerprint match', () => {
    const f = new DeploymentFingerprint();
    expect(f.verify('abc', 'abc')).toBe(true);
    expect(f.verify('abc', 'xyz')).toBe(false);
  });
});
