import type { CognitionSnapshot } from './cognition-types.ts';

export function serializeSnapshot(snapshot: CognitionSnapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializeSnapshot(json: string): CognitionSnapshot {
  return JSON.parse(json) as CognitionSnapshot;
}

export function compareSnapshots(a: CognitionSnapshot, b: CognitionSnapshot): boolean {
  return a.fingerprint === b.fingerprint;
}
