import type { ContextEnvelope, MemoryEntry, ArchitecturalFinding } from '../contracts/memory-contracts.ts';
import type { ChainResult } from '../reasoning/reasoning-chain.ts';
import { MemoryRepository } from '../repository/memory-repository.ts';
import { ContextBudget } from './context-budget.ts';
import { ContextCompression } from './context-compression.ts';
import { ContextDeduplication } from './context-deduplication.ts';
import { createContextEnvelope, envelopeToMemoryEntry } from './context-envelope.ts';
import { computeContextFingerprint } from '../hashing/memory-fingerprint.ts';

export interface OrchestratorOptions {
  readonly budget: number;
  readonly compress: boolean;
  readonly deduplicate: boolean;
  readonly includeFindings: boolean;
  readonly maxFindings: number;
}

const DEFAULT_OPTIONS: OrchestratorOptions = Object.freeze({
  budget: 8192,
  compress: true,
  deduplicate: true,
  includeFindings: true,
  maxFindings: 20,
});

export class ContextOrchestrator {
  readonly repository: MemoryRepository;
  readonly budget: ContextBudget;
  readonly compression: ContextCompression;
  readonly deduplication: ContextDeduplication;

  private _options: OrchestratorOptions;

  constructor(repository: MemoryRepository, options?: Partial<OrchestratorOptions>) {
    this.repository = repository;
    this.budget = new ContextBudget(options?.budget ?? DEFAULT_OPTIONS.budget);
    this.compression = new ContextCompression();
    this.deduplication = new ContextDeduplication();
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  get options(): OrchestratorOptions {
    return Object.freeze({ ...this._options });
  }

  updateOptions(options: Partial<OrchestratorOptions>): void {
    this._options = { ...this._options, ...options };
  }

  buildEnvelope(
    entries: readonly MemoryEntry[],
    findings: readonly ArchitecturalFinding[],
    chainResults: readonly ChainResult[],
  ): ContextEnvelope {
    let processedEntries = [...entries];
    let processedFindings = [...findings];

    if (this._options.deduplicate) {
      processedEntries = [...this.deduplication.deduplicateEntries(processedEntries)];
      processedFindings = [...this.deduplication.deduplicateFindings(processedFindings)];
    }

    const chainIds = chainResults.map(c => c.chainId);

    if (this._options.compress) {
      const compressed = this.compression.compressByPriority(processedEntries, this._options.budget);
      processedEntries = [...compressed.entries];
      if (this._options.includeFindings) {
        processedFindings = [...this.compression.compressFindings(processedFindings, this._options.maxFindings)];
      }
    }

    const allocated = this.budget.allocateBudget(Object.freeze(processedEntries));

    const envelope = createContextEnvelope({
      entries: allocated,
      findings: Object.freeze(processedFindings),
      reasoningChainIds: chainIds,
      budget: this._options.budget,
      overflow: processedEntries.length > allocated.length,
    });

    this.repository.storeEntry(envelopeToMemoryEntry(envelope));
    return envelope;
  }

  buildFromRepository(
    entryIds: readonly string[],
    findingTypes?: readonly string[],
    chainResults?: readonly ChainResult[],
  ): ContextEnvelope {
    const entries = this.repository.getEntries(entryIds);
    let findings = this.repository.getAllFindings();

    if (findingTypes && findingTypes.length > 0) {
      findings = findings.filter(f => findingTypes.includes(f.findingType));
    }

    return this.buildEnvelope(entries, findings, chainResults ?? []);
  }

  getOrchestrationFingerprint(entryIds: readonly string[]): string {
    return computeContextFingerprint(entryIds, this._options.budget);
  }

  reset(): void {
    this.budget.reset();
  }
}
