import { SerializationError } from '../errors/index.ts';
import { DeterministicSerializer } from './deterministic-serializer.ts';
import type { ReasoningSnapshotData } from '../snapshots/reasoning-snapshot.ts';

export type SnapshotExportFormat = 'json' | 'pretty' | 'minimal';

const serializer = new DeterministicSerializer();

export function serializeSnapshot(snapshot: ReasoningSnapshotData): string {
  try {
    return serializer.serialize(snapshot);
  } catch (cause) {
    throw new SerializationError('Failed to serialize snapshot', { snapshotId: snapshot.id, cause });
  }
}

export function deserializeSnapshot(json: string): ReasoningSnapshotData {
  if (!json) {
    throw new SerializationError('Cannot deserialize empty snapshot JSON');
  }
  try {
    return serializer.deserialize<ReasoningSnapshotData>(json);
  } catch (cause) {
    throw new SerializationError('Failed to deserialize snapshot', { cause });
  }
}

export function serializeSnapshotChain(chain: ReasoningSnapshotData[]): string {
  try {
    const ordered = [...chain].sort((a, b) => (a.version ?? 0) - (b.version ?? 0));

    const chainData = ordered.map((snap, index) => ({
      ...snap,
      chainPosition: index,
    }));

    return serializer.serialize(chainData);
  } catch (cause) {
    throw new SerializationError('Failed to serialize snapshot chain', { chainLength: chain.length, cause });
  }
}

export function deserializeSnapshotChain(json: string): ReasoningSnapshotData[] {
  if (!json) {
    throw new SerializationError('Cannot deserialize empty snapshot chain JSON');
  }
  try {
    const chain = serializer.deserialize<Array<ReasoningSnapshotData & { chainPosition: number }>>(json);
    return chain
      .sort((a, b) => a.chainPosition - b.chainPosition)
      .map(({ chainPosition: _, ...snap }) => snap);
  } catch (cause) {
    throw new SerializationError('Failed to deserialize snapshot chain', { cause });
  }
}

export function exportSnapshot(snapshot: ReasoningSnapshotData, format: SnapshotExportFormat = 'json'): string {
  switch (format) {
    case 'minimal': {
      const minimal = {
        id: snapshot.id,
        sessionId: snapshot.sessionId,
        version: snapshot.version,
        type: snapshot.snapshotType,
        stateHash: snapshot.stateHash,
        fingerprintHash: snapshot.fingerprintHash,
        createdAt: snapshot.createdAt,
      };
      return JSON.stringify(minimal);
    }
    case 'pretty': {
      return JSON.stringify(snapshot, null, 2);
    }
    case 'json':
    default: {
      return serializeSnapshot(snapshot);
    }
  }
}
