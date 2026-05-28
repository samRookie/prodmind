import type { CognitionIndex, IndexEntry, IndexBuildInput } from './indexing-types.ts';
import { fingerprintIndex, fingerprintIndexEntry } from './index-fingerprint.ts';

export function buildNodeIndex(input: IndexBuildInput): CognitionIndex {
  const entries: IndexEntry[] = (input.nodes ?? []).map(n => {
    const entry: IndexEntry = {
      id: n.id, key: `node:${n.name}`,
      value: { type: n.type, subsystem: n.subsystem ?? null, namespace: n.namespace ?? null },
      fingerprint: '',
    };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'NODE_INDEX', entries: entries.sort((a, b) => a.key.localeCompare(b.key)), builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}

export function buildEdgeIndex(input: IndexBuildInput): CognitionIndex {
  const entries: IndexEntry[] = (input.edges ?? []).map(e => {
    const entry: IndexEntry = {
      id: e.id ?? `${e.sourceId}->${e.targetId}`, key: `edge:${e.sourceId}:${e.targetId}`,
      value: { sourceId: e.sourceId, targetId: e.targetId, type: e.type },
      fingerprint: '',
    };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'EDGE_INDEX', entries: entries.sort((a, b) => a.key.localeCompare(b.key)), builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}

export function buildSccIndex(input: IndexBuildInput): CognitionIndex {
  const entries: IndexEntry[] = (input.sccs ?? []).map(s => {
    const entry: IndexEntry = {
      id: s.id, key: `scc:${s.id}`,
      value: { nodeCount: s.nodes.length, nodes: [...s.nodes].sort() },
      fingerprint: '',
    };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'SCC_INDEX', entries: entries.sort((a, b) => a.key.localeCompare(b.key)), builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}

export function buildNamespaceIndex(input: IndexBuildInput): CognitionIndex {
  const namespaceMap = new Map<string, string[]>();
  for (const node of input.nodes ?? []) {
    const ns = node.namespace ?? node.subsystem ?? 'default';
    if (!namespaceMap.has(ns)) namespaceMap.set(ns, []);
    namespaceMap.get(ns)!.push(node.id);
  }
  const entries: IndexEntry[] = [...namespaceMap.entries()].sort().map(([ns, ids]) => {
    const entry: IndexEntry = { id: ns, key: `namespace:${ns}`, value: { namespace: ns, nodeIds: [...ids].sort() }, fingerprint: '' };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'NAMESPACE_INDEX', entries, builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}

export function buildSubsystemIndex(input: IndexBuildInput): CognitionIndex {
  const subsystemMap = new Map<string, string[]>();
  for (const node of input.nodes ?? []) {
    const ss = node.subsystem ?? 'default';
    if (!subsystemMap.has(ss)) subsystemMap.set(ss, []);
    subsystemMap.get(ss)!.push(node.id);
  }
  const entries: IndexEntry[] = [...subsystemMap.entries()].sort().map(([ss, ids]) => {
    const entry: IndexEntry = { id: ss, key: `subsystem:${ss}`, value: { subsystem: ss, nodeIds: [...ids].sort() }, fingerprint: '' };
    entry.fingerprint = fingerprintIndexEntry(entry);
    return entry;
  });
  const index: CognitionIndex = { indexType: 'SUBSYSTEM_INDEX', entries, builtAt: new Date().toISOString(), fingerprint: '' };
  index.fingerprint = fingerprintIndex(index);
  return index;
}
