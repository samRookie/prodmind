import type { MemoryEntry, ContextEnvelope } from '../contracts/memory-contracts.ts';
import { computeMemoryFingerprint, computeContextFingerprint } from '../hashing/memory-fingerprint.ts';
import { deterministicJson } from '../serialization/memory-serializer.ts';

export class RetrievalFingerprint {
  compute(entries: readonly MemoryEntry[]): string {
    const parts = [...entries]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(e => `${e.id}:${e.fingerprint}:${e.timestamp}`);
    return computeMemoryFingerprint(parts);
  }

  computeEnvelopeFingerprint(envelope: ContextEnvelope): string {
    return computeContextFingerprint(
      envelope.entries.map(e => e.id),
      envelope.budget,
    );
  }

  computeWithMetadata(entries: readonly MemoryEntry[], metadata: Readonly<Record<string, string>>): string {
    const entryPart = this.compute(entries);
    const metaPart = deterministicJson(metadata);
    return computeMemoryFingerprint([entryPart, metaPart]);
  }

  verify(
    expected: string,
    entries: readonly MemoryEntry[],
  ): boolean {
    const actual = this.compute(entries);
    return expected === actual;
  }

  verifyEnvelope(
    expected: string,
    envelope: ContextEnvelope,
  ): boolean {
    const actual = this.computeEnvelopeFingerprint(envelope);
    return expected === actual;
  }
}
