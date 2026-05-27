import type { MemoryEntry } from '../contracts/memory-contracts.ts';
import { computeChainFingerprint } from '../hashing/memory-fingerprint.ts';

export interface ReasoningStep {
  readonly stepIndex: number;
  readonly description: string;
  readonly evidenceIds: readonly string[];
  readonly confidence: number;
}

export interface ChainResult {
  readonly chainId: string;
  readonly chainType: string;
  readonly steps: readonly ReasoningStep[];
  readonly conclusion: string;
  readonly confidence: number;
  readonly fingerprint: string;
}

let chainIdCounter = 0;

export class ReasoningChain {
  readonly chainType: string;
  private readonly _steps: ReasoningStep[] = [];

  constructor(chainType: string) {
    this.chainType = chainType;
  }

  get steps(): readonly ReasoningStep[] {
    return Object.freeze([...this._steps]);
  }

  get stepCount(): number {
    return this._steps.length;
  }

  addStep(description: string, evidenceIds: readonly string[], confidence: number): ReasoningStep {
    const step: ReasoningStep = Object.freeze({
      stepIndex: this._steps.length,
      description,
      evidenceIds: Object.freeze([...evidenceIds]),
      confidence,
    });
    this._steps.push(step);
    return step;
  }

  build(conclusion: string): ChainResult {
    chainIdCounter++;
    const chainId = `chain_${chainIdCounter}`;
    const avgConfidence = this._steps.length > 0
      ? this._steps.reduce((s, step) => s + step.confidence, 0) / this._steps.length
      : 0;
    const allEvidenceIds = this._steps.flatMap(s => s.evidenceIds);
    const fp = computeChainFingerprint(this.chainType, allEvidenceIds);

    return Object.freeze({
      chainId,
      chainType: this.chainType,
      steps: Object.freeze([...this._steps]),
      conclusion,
      confidence: avgConfidence,
      fingerprint: fp,
    });
  }

  clear(): void {
    this._steps.length = 0;
  }
}

export function chainResultToMemoryEntry(result: ChainResult): MemoryEntry {
  return Object.freeze({
    id: result.chainId,
    category: 'architectural',
    timestamp: '',
    content: result.conclusion,
    fingerprint: result.fingerprint,
    metadata: Object.freeze({
      chainType: result.chainType,
      stepCount: String(result.steps.length),
      confidence: String(result.confidence),
    }),
    tags: Object.freeze([result.chainType, ...result.steps.flatMap(s => s.evidenceIds)]),
    provenanceId: '',
    parentId: '',
  });
}
