import { describe, it, expect } from 'vitest';
import { buildHotspotIndex } from '../../indexing/hotspot-index.ts';
import type { IndexBuildInput } from '../../indexing/indexing-types.ts';

describe('HotspotIndex', () => {
  it('builds index from hotspots', () => {
    const input: IndexBuildInput = {
      hotspots: [
        { nodeId: 'n1', severity: 'HIGH', reason: 'Hotspot 1', impactedNodes: ['n1'] },
        { nodeId: 'n2', severity: 'CRITICAL', reason: 'Hotspot 2', impactedNodes: ['n2'] },
      ],
    };
    const index = buildHotspotIndex(input);
    expect(index.entries).toHaveLength(2);
    expect(index.fingerprint).toBeTruthy();
  });

  it('handles empty input', () => {
    const index = buildHotspotIndex({});
    expect(index.entries).toHaveLength(0);
  });
});
