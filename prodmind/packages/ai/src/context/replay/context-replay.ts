import type { ContextAssemblyResult, ContextReplayEnvelope } from '../contracts.ts';
import { createContextReplayEnvelope } from '../contracts.ts';
import { ReplayMismatchError } from '../errors.ts';
import { ContextFingerprinter } from '../normalization/fingerprinter.ts';

export class ContextReplayEngine {
  private fingerprinter: ContextFingerprinter;

  constructor() {
    this.fingerprinter = new ContextFingerprinter();
  }

  compare(
    original: ContextAssemblyResult,
    replayed: ContextAssemblyResult,
  ): ContextReplayEnvelope {
    const originalFingerprint = original.fingerprint;
    const replayedFingerprint = this.fingerprinter.fingerprint(replayed);
    const match = originalFingerprint === replayedFingerprint;

    const divergence: string[] = [];
    if (!match) {
      if (original.slices.length !== replayed.slices.length) {
        divergence.push(
          `slice_count: ${original.slices.length} vs ${replayed.slices.length}`,
        );
      }

      for (let i = 0; i < Math.min(original.slices.length, replayed.slices.length); i++) {
        const oSlice = original.slices[i]!;
        const rSlice = replayed.slices[i]!;

        if (oSlice.kind !== rSlice.kind) {
          divergence.push(`slice[${i}].kind: ${oSlice.kind} vs ${rSlice.kind}`);
        }
        if (oSlice.id !== rSlice.id) {
          divergence.push(`slice[${i}].id: ${oSlice.id} vs ${rSlice.id}`);
        }
        if (oSlice.nodes.length !== rSlice.nodes.length) {
          divergence.push(`slice[${i}].node_count: ${oSlice.nodes.length} vs ${rSlice.nodes.length}`);
        }
        if (oSlice.tokenCount !== rSlice.tokenCount) {
          divergence.push(`slice[${i}].token_count: ${oSlice.tokenCount} vs ${rSlice.tokenCount}`);
        }
      }

      if (original.budget.used !== replayed.budget.used) {
        divergence.push(`budget_used: ${original.budget.used} vs ${replayed.budget.used}`);
      }
    }

    return createContextReplayEnvelope({
      originalFingerprint,
      replayedFingerprint,
      match,
      divergence,
      originalResult: original,
      replayedResult: replayed,
    });
  }

  assertMatch(original: ContextAssemblyResult, replayed: ContextAssemblyResult): void {
    const envelope = this.compare(original, replayed);
    if (!envelope.match) {
      throw new ReplayMismatchError(
        envelope.originalFingerprint,
        envelope.replayedFingerprint,
        [...envelope.divergence],
      );
    }
  }
}
