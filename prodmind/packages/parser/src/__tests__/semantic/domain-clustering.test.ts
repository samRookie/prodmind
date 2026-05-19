import { describe, it, expect } from 'vitest';
import { clusterDomainRegions, computeClusterAffinity, detectSharedClusters, detectFragmentedDomains } from '../../semantic/domain-clustering.ts';
import type { DomainClusterResult } from '../../semantic/types.ts';

describe('clusterDomainRegions', () => {
  it('creates clusters based on namespace', () => {
    const nodes = [
      { id: 'n1', filePath: 'src/routes/users.ts' },
      { id: 'n2', filePath: 'src/routes/orders.ts' },
      { id: 'n3', filePath: 'src/services/user.ts' },
      { id: 'n4', filePath: 'src/services/order.ts' },
    ];
    const edges = [
      { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n3' },
      { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n4' },
    ];
    const result = clusterDomainRegions('snap-1', nodes, edges);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((c) => c.snapshotId === 'snap-1')).toBe(true);
    expect(result.every((c) => c.clusterId.length > 0)).toBe(true);
  });

  it('assigns deterministic cluster IDs for same input', () => {
    const nodes = [
      { id: 'n1', filePath: 'src/routes/users.ts' },
      { id: 'n2', filePath: 'src/services/user.ts' },
    ];
    const edges = [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' }];

    const first = clusterDomainRegions('snap-1', nodes, edges);
    const second = clusterDomainRegions('snap-1', nodes, edges);

    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(first[i]!.clusterId).toBe(second[i]!.clusterId);
      expect(first[i]!.cohesionScore).toBe(second[i]!.cohesionScore);
      expect(first[i]!.nodeIds).toEqual(second[i]!.nodeIds);
    }
  });

  it('computes cohesion score for connected clusters', () => {
    const nodes = [
      { id: 'n1', filePath: 'src/services/user.ts' },
      { id: 'n2', filePath: 'src/services/order.ts' },
      { id: 'n3', filePath: 'src/services/payment.ts' },
    ];
    const edges = [
      { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' },
      { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3' },
      { id: 'e3', sourceNodeId: 'n1', targetNodeId: 'n3' },
    ];
    const result = clusterDomainRegions('snap-1', nodes, edges);
    const services = result.find((c) => c.clusterName === 'services');
    expect(services).toBeDefined();
    expect(services!.cohesionScore).toBeGreaterThan(0);
  });

  it('orders clusters by name', () => {
    const nodes = [
      { id: 'n1', filePath: 'src/zzz/one.ts' },
      { id: 'n2', filePath: 'src/aaa/two.ts' },
    ];
    const emptyEdges: Array<{ id: string; sourceNodeId: string; targetNodeId: string }> = [];
    const result = clusterDomainRegions('snap-1', nodes, emptyEdges);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.clusterName.localeCompare(result[i - 1]!.clusterName)).toBeGreaterThanOrEqual(0);
    }
  });

  it('includes boundary metadata JSON for clusters', () => {
    const nodes = [
      { id: 'n1', filePath: 'src/services/user.ts' },
      { id: 'n2', filePath: 'src/services/order.ts' },
    ];
    const edges = [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2' }];
    const result = clusterDomainRegions('snap-1', nodes, edges);
    const services = result.find((c) => c.clusterName === 'services');
    expect(services).toBeDefined();
    if (services && services.boundaryMetadataJson) {
      const meta = JSON.parse(services.boundaryMetadataJson);
      expect(meta).toHaveProperty('regionCount');
      expect(meta).toHaveProperty('regions');
    }
  });
});

describe('computeClusterAffinity', () => {
  it('returns 0 for disjoint clusters', () => {
    const a: DomainClusterResult = { clusterId: 'c1', snapshotId: 's1', clusterName: 'a', nodeIds: ['n1', 'n2'], cohesionScore: 0, fragmentationScore: 0, boundaryMetadataJson: null };
    const b: DomainClusterResult = { clusterId: 'c2', snapshotId: 's1', clusterName: 'b', nodeIds: ['n3', 'n4'], cohesionScore: 0, fragmentationScore: 0, boundaryMetadataJson: null };
    expect(computeClusterAffinity(a, b)).toBe(0);
  });

  it('returns 1 for identical clusters', () => {
    const a: DomainClusterResult = { clusterId: 'c1', snapshotId: 's1', clusterName: 'a', nodeIds: ['n1', 'n2'], cohesionScore: 0, fragmentationScore: 0, boundaryMetadataJson: null };
    expect(computeClusterAffinity(a, a)).toBe(1);
  });
});

describe('detectSharedClusters', () => {
  it('detects clusters named shared, utils, lib, common', () => {
    const clusters: DomainClusterResult[] = [
      { clusterId: 'c1', snapshotId: 's1', clusterName: 'services', nodeIds: ['n1'], cohesionScore: 0, fragmentationScore: 0, boundaryMetadataJson: null },
      { clusterId: 'c2', snapshotId: 's1', clusterName: 'shared', nodeIds: ['n2'], cohesionScore: 0, fragmentationScore: 0, boundaryMetadataJson: null },
      { clusterId: 'c3', snapshotId: 's1', clusterName: 'utils', nodeIds: ['n3'], cohesionScore: 0, fragmentationScore: 0, boundaryMetadataJson: null },
    ];
    const shared = detectSharedClusters(clusters);
    expect(shared.length).toBe(2);
    expect(shared.map((c) => c.clusterName)).toEqual(expect.arrayContaining(['shared', 'utils']));
  });
});

describe('detectFragmentedDomains', () => {
  it('returns clusters with fragmentation > 0.5', () => {
    const clusters: DomainClusterResult[] = [
      { clusterId: 'c1', snapshotId: 's1', clusterName: 'frag', nodeIds: ['n1', 'n2'], cohesionScore: 0, fragmentationScore: 0.8, boundaryMetadataJson: null },
      { clusterId: 'c2', snapshotId: 's1', clusterName: 'cohesive', nodeIds: ['n3'], cohesionScore: 0, fragmentationScore: 0.1, boundaryMetadataJson: null },
    ];
    const frag = detectFragmentedDomains(clusters);
    expect(frag.length).toBe(1);
    expect(frag[0]!.clusterName).toBe('frag');
  });
});
