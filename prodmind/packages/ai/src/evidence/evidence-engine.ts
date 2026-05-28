import type { EvidenceLinkingInput, EvidenceEngineOutput } from './evidence-types.ts';
import { EvidenceLinker } from './evidence-linker.ts';
import { EvidenceValidator } from './evidence-validator.ts';

export class EvidenceEngine {
  private readonly linker: EvidenceLinker;
  private readonly validator: EvidenceValidator;

  constructor() {
    this.linker = new EvidenceLinker();
    this.validator = new EvidenceValidator();
  }

  link(input: EvidenceLinkingInput): EvidenceEngineOutput {
    const validationResult = this.validator.validateLinkingInput(input);

    if (!validationResult.valid) {
      return {
        snapshotId: input.snapshotId,
        records: [],
        totalLinked: 0,
        validationResult,
      };
    }

    const records = this.linker.link(input);

    return {
      snapshotId: input.snapshotId,
      records,
      totalLinked: records.length,
      validationResult,
    };
  }
}
