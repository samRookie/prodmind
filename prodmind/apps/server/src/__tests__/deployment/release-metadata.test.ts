import { describe, it, expect } from 'vitest';
import { collectReleaseMetadata } from '../../deployment/release-metadata.ts';

describe('ReleaseMetadata', () => {
  it('collects metadata with defaults', () => {
    const m = collectReleaseMetadata({ AI_PROVIDER: 'mock' });
    expect(m.version).toBe('0.0.0-local');
    expect(m.fingerprint).toBeTruthy();
    expect(m.nodeVersion).toBe(process.version);
  });

  it('uses provided values', () => {
    const m = collectReleaseMetadata({ RELEASE_VERSION: '1.0.0', RELEASE_COMMIT: 'abc123', RELEASE_TIMESTAMP: '2024-01-01', AI_PROVIDER: 'anthropic' });
    expect(m.version).toBe('1.0.0');
    expect(m.commit).toBe('abc123');
    expect(m.aiProvider).toBe('anthropic');
  });
});
