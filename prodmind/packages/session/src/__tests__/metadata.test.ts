import { describe, it, expect } from 'vitest';
import { GraphReference } from '../metadata/graph-reference.ts';
import { GraphStateLinker } from '../metadata/graph-state-linker.ts';
import { VersionReference } from '../metadata/version-reference.ts';
import { SemanticStateReference } from '../metadata/semantic-state-reference.ts';

describe('GraphReference', () => {
  it('should create node reference', () => {
    const ref = GraphReference.createNodeReference('sess-1', 'node-1', 'snap-1');
    expect(ref.referenceType).toBe('NODE');
    expect(ref.nodeId).toBe('node-1');
  });

  it('should create edge reference', () => {
    const ref = GraphReference.createEdgeReference('sess-1', 'edge-1', 'snap-1');
    expect(ref.referenceType).toBe('EDGE');
    expect(ref.edgeId).toBe('edge-1');
  });

  it('should create snapshot reference', () => {
    const ref = GraphReference.createSnapshotReference('sess-1', 'snap-1');
    expect(ref.referenceType).toBe('SNAPSHOT');
    expect(ref.snapshotId).toBe('snap-1');
  });

  it('should validate correct reference', () => {
    const ref = GraphReference.createNodeReference('sess-1', 'node-1', 'snap-1');
    expect(ref.validate(ref)).toBe(true);
  });

  it('should invalidate reference without sessionId', () => {
    const invalid = new GraphReference({ sessionId: '', referenceType: 'NODE', nodeId: 'n1' });
    expect(invalid.validate(invalid)).toBe(false);
  });

  it('should resolve reference based on type', () => {
    const ref = GraphReference.createNodeReference('sess-1', 'node-1', 'snap-1');
    const db = { getNode: (id: string) => `node:${id}` };
    const result = ref.resolveReference(db);
    expect(result).toBe('node:node-1');
  });

  it('should serialize and deserialize', () => {
    const original = GraphReference.createNodeReference('sess-1', 'node-1', 'snap-1');
    const json = original.toJSON();
    const restored = GraphReference.fromJSON(json);
    expect(restored.sessionId).toBe('sess-1');
    expect(restored.nodeId).toBe('node-1');
  });
});

describe('GraphStateLinker', () => {
  it('should link session to graph state', () => {
    const linker = new GraphStateLinker();
    const link = linker.linkSessionToGraphState('sess-1', 'graph-1');
    expect(link.sessionId).toBe('sess-1');
    expect(link.graphSnapshotId).toBe('graph-1');
  });

  it('should return existing link on duplicate', () => {
    const linker = new GraphStateLinker();
    linker.linkSessionToGraphState('sess-1', 'graph-1');
    const link2 = linker.linkSessionToGraphState('sess-1', 'graph-1');
    expect(link2.graphSnapshotId).toBe('graph-1');
  });

  it('should get linked graph states', () => {
    const linker = new GraphStateLinker();
    linker.linkSessionToGraphState('sess-1', 'graph-1');
    linker.linkSessionToGraphState('sess-1', 'graph-2');
    expect(linker.getLinkedGraphStates('sess-1')).toHaveLength(2);
  });

  it('should get sessions for graph state', () => {
    const linker = new GraphStateLinker();
    linker.linkSessionToGraphState('sess-1', 'graph-1');
    linker.linkSessionToGraphState('sess-2', 'graph-1');
    expect(linker.getSessionsForGraphState('graph-1')).toHaveLength(2);
  });

  it('should unlink session from graph', () => {
    const linker = new GraphStateLinker();
    linker.linkSessionToGraphState('sess-1', 'graph-1');
    linker.unlinkSessionFromGraph('sess-1', 'graph-1');
    expect(linker.getLinkedGraphStates('sess-1')).toHaveLength(0);
  });

  it('should add reference to link', () => {
    const linker = new GraphStateLinker();
    const ref = linker.addReferenceToLink('sess-1', 'graph-1', { sessionId: 'sess-1', referenceType: 'NODE', nodeId: 'n1' });
    expect(ref.referenceType).toBe('NODE');
    const refs = linker.getGraphReferencesForSession('sess-1');
    expect(refs).toHaveLength(1);
  });
});

describe('VersionReference', () => {
  it('should create version', () => {
    const vr = new VersionReference();
    const record = vr.createVersion('sess-1', 'snap-1');
    expect(record.version).toBe(1);
    expect(record.sessionId).toBe('sess-1');
  });

  it('should create with explicit version number', () => {
    const vr = new VersionReference();
    const record = vr.createVersion('sess-1', 'snap-1', 5);
    expect(record.version).toBe(5);
  });

  it('should increment version automatically', () => {
    const vr = new VersionReference();
    vr.createVersion('sess-1', 'snap-1');
    const v2 = vr.createVersion('sess-1', 'snap-2');
    expect(v2.version).toBe(2);
  });

  it('should get version history', () => {
    const vr = new VersionReference();
    vr.createVersion('sess-1', 'snap-1');
    vr.createVersion('sess-1', 'snap-2');
    expect(vr.getVersionHistory('sess-1')).toHaveLength(2);
  });

  it('should get specific version', () => {
    const vr = new VersionReference();
    vr.createVersion('sess-1', 'snap-1');
    const v2 = vr.createVersion('sess-1', 'snap-2');
    expect(vr.getVersion('sess-1', 2)?.id).toBe(v2.id);
  });

  it('should return undefined for non-existent version', () => {
    const vr = new VersionReference();
    expect(vr.getVersion('sess-1', 99)).toBeUndefined();
  });

  it('should get latest version', () => {
    const vr = new VersionReference();
    expect(vr.getLatestVersion('sess-1')).toBeUndefined();
    vr.createVersion('sess-1', 'snap-1');
    const v2 = vr.createVersion('sess-1', 'snap-2');
    expect(vr.getLatestVersion('sess-1')?.id).toBe(v2.id);
  });

  it('should compare versions', () => {
    const vr = new VersionReference();
    expect(vr.compareVersions(1, 2)).toBe(-1);
    expect(vr.compareVersions(2, 1)).toBe(1);
    expect(vr.compareVersions(1, 1)).toBe(0);
  });

  it('should increment version', () => {
    const vr = new VersionReference();
    expect(vr.incrementVersion(5)).toBe(6);
  });
});

describe('SemanticStateReference', () => {
  it('should create reference', () => {
    const ssr = new SemanticStateReference({ sessionId: 'sess-1', label: 'milestone', stateHash: 'hash123' });
    const ref = ssr.createReference('sess-1', 'milestone', 'hash123');
    expect(ref.label).toBe('milestone');
    expect(ref.stateHash).toBe('hash123');
  });

  it('should find by label', () => {
    const ssr = new SemanticStateReference({ sessionId: 'sess-1', label: 'a', stateHash: 'h1' });
    ssr.createReference('sess-1', 'milestone', 'hash123');
    ssr.createReference('sess-1', 'checkpoint', 'hash456');
    const found = ssr.findByLabel('sess-1', 'milestone');
    expect(found).toHaveLength(1);
  });

  it('should find by state hash', () => {
    const ssr = new SemanticStateReference({ sessionId: 'sess-1', label: 'a', stateHash: 'h1' });
    ssr.createReference('sess-1', 'm1', 'hash123');
    ssr.createReference('sess-1', 'm2', 'hash456');
    const found = ssr.findByStateHash('sess-1', 'hash123');
    expect(found).toHaveLength(1);
  });

  it('should delete reference', () => {
    const ssr = new SemanticStateReference({ sessionId: 'sess-1', label: 'a', stateHash: 'h1' });
    const ref = ssr.createReference('sess-1', 'm1', 'hash123');
    ssr.deleteReference(ref.id);
    expect(ssr.listReferences('sess-1')).toHaveLength(0);
  });

  it('should list references', () => {
    const ssr = new SemanticStateReference({ sessionId: 'sess-1', label: 'a', stateHash: 'h1' });
    ssr.createReference('sess-1', 'm1', 'hash123');
    ssr.createReference('sess-1', 'm2', 'hash456');
    expect(ssr.listReferences('sess-1')).toHaveLength(2);
  });

  it('should serialize and deserialize', () => {
    const original = new SemanticStateReference({ sessionId: 'sess-1', label: 'test', stateHash: 'hash123' });
    const json = original.toJSON();
    const restored = SemanticStateReference.fromJSON(json);
    expect(restored.label).toBe('test');
  });
});
