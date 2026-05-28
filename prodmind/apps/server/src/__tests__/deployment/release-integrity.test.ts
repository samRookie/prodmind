import { describe, it, expect } from 'vitest';
import { ReleaseIntegrity } from '../../deployment/release-integrity.ts';
import { collectReleaseMetadata } from '../../deployment/release-metadata.ts';

describe('ReleaseIntegrity', () => {
  it('verifies package integrity', () => {
    const i = new ReleaseIntegrity();
    const m = collectReleaseMetadata({ AI_PROVIDER: 'mock' });
    const result = i.verifyPackageIntegrity(m);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it('detects metadata tampering', () => {
    const i = new ReleaseIntegrity();
    const m = collectReleaseMetadata({ AI_PROVIDER: 'mock' });
    const tampered = { ...m, nodeVersion: 'v99.0.0' };
    const result = i.verifyPackageIntegrity(tampered);
    const nodeCheck = result.checks.find(c => c.name === 'node-version');
    expect(nodeCheck?.passed).toBe(false);
  });
});
