import type { ArchitectureDiff, DiffInput } from './diff-types.ts';
import { detectRiskChanges } from './cognition-diff.ts';
import { detectHotspotChanges } from './cognition-diff.ts';

export function detectRiskEvolution(input: DiffInput): ArchitectureDiff[] {
  return [
    ...detectRiskChanges(input),
    ...detectHotspotChanges(input),
  ];
}
