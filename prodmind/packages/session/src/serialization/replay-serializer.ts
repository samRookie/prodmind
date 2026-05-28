import { SerializationError } from '../errors/index.ts';
import { DeterministicSerializer } from './deterministic-serializer.ts';
import type { SessionReplayData } from '../replay/session-replay.ts';

export type ReplayExportFormat = 'json' | 'pretty' | 'audit';

const serializer = new DeterministicSerializer();

export function serializeReplayLink(link: SessionReplayData): string {
  try {
    return serializer.serialize(link);
  } catch (cause) {
    throw new SerializationError('Failed to serialize replay link', { replayId: link.id, cause });
  }
}

export function deserializeReplayLink(json: string): SessionReplayData {
  if (!json) {
    throw new SerializationError('Cannot deserialize empty replay link JSON');
  }
  try {
    return serializer.deserialize<SessionReplayData>(json);
  } catch (cause) {
    throw new SerializationError('Failed to deserialize replay link', { cause });
  }
}

export function serializeReplayBatch(links: SessionReplayData[]): string {
  try {
    const batch = links.map((link, index) => ({
      ...link,
      batchIndex: index,
    }));
    return serializer.serialize(batch);
  } catch (cause) {
    throw new SerializationError('Failed to serialize replay batch', { linkCount: links.length, cause });
  }
}

export function deserializeReplayBatch(json: string): SessionReplayData[] {
  if (!json) {
    throw new SerializationError('Cannot deserialize empty replay batch JSON');
  }
  try {
    const batch = serializer.deserialize<Array<SessionReplayData & { batchIndex: number }>>(json);
    return batch
      .sort((a, b) => a.batchIndex - b.batchIndex)
      .map(({ batchIndex: _, ...link }) => link);
  } catch (cause) {
    throw new SerializationError('Failed to deserialize replay batch', { cause });
  }
}

export function exportReplayAudit(auditEntries: SessionReplayData[], format: ReplayExportFormat = 'json'): string {
  const sorted = [...auditEntries].sort(
    (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
  );

  switch (format) {
    case 'audit': {
      const auditData = sorted.map((entry) => ({
        id: entry.id,
        sessionId: entry.sessionId,
        linkType: entry.linkType,
        status: entry.status,
        createdAt: entry.createdAt,
        verifiedAt: entry.verifiedAt,
        failureReason: entry.failureReason,
        verificationHash: entry.verificationHash ? entry.verificationHash.slice(0, 16) + '...' : undefined,
      }));
      return JSON.stringify(auditData, null, 2);
    }
    case 'pretty': {
      return JSON.stringify(sorted, null, 2);
    }
    case 'json':
    default: {
      return serializeReplayBatch(sorted);
    }
  }
}
