import type { MemoryEntry, ArchitecturalFinding, EvolutionEvent, VolatilityEvent, ContextEnvelope, RetrievalResult } from '../contracts/memory-contracts.ts';

export function serializeMemoryEntry(entry: MemoryEntry): string {
  return JSON.stringify(entry, Object.keys(entry).sort());
}

export function deserializeMemoryEntry(json: string): MemoryEntry {
  return JSON.parse(json) as MemoryEntry;
}

export function serializeFinding(finding: ArchitecturalFinding): string {
  return JSON.stringify(finding, Object.keys(finding).sort());
}

export function serializeContextEnvelope(envelope: ContextEnvelope): string {
  return JSON.stringify(envelope, Object.keys(envelope).sort());
}

export function serializeRetrievalResult(result: RetrievalResult): string {
  return JSON.stringify(result, Object.keys(result).sort());
}

export function deterministicJson(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

export function serializeEvolutionEvent(event: EvolutionEvent): string {
  return JSON.stringify(event, Object.keys(event).sort());
}

export function serializeVolatilityEvent(event: VolatilityEvent): string {
  return JSON.stringify(event, Object.keys(event).sort());
}
