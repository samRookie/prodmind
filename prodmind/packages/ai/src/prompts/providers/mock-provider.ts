import type { PromptCategory, ProviderExecutionEnvelope, ProviderResponseEnvelope } from '../contracts/prompt-contracts.ts';
import { createProviderResponseEnvelope } from '../envelopes/prompt-envelopes.ts';
import type { ProviderAdapter, ProviderCapabilityDescriptor } from './provider-adapter.ts';

export interface MockProviderConfig {
  readonly failureMode: 'none' | 'timeout' | 'malformed' | 'validation_failure' | 'partial';
  readonly simulatedLatencyMs: number;
  readonly seed: string;
}

const DEFAULT_MOCK_CONFIG: MockProviderConfig = Object.freeze({
  failureMode: 'none',
  simulatedLatencyMs: 5,
  seed: 'deterministic-mock',
});

function generateDeterministicResponse(envelopeFingerprint: string): string {
  const hash = envelopeFingerprint.slice(0, 32);
  return `Mock Analysis Result (fingerprint: ${hash})\n\n` +
    `Executive Summary\n` +
    `This is a deterministic mock response for prompt "${hash.substring(0, 8)}".\n\n` +
    `Architecture Findings\n` +
    `- high: Component structure appears stable.\n` +
    `- medium: Dependency graph is well-formed.\n\n` +
    `Recommendations\n` +
    `- medium: Monitor coupling over time.\n` +
    `- low: Review architectural boundaries.\n\n` +
    `Confidence: 0.85\n`;
}

export class MockProviderAdapter implements ProviderAdapter {
  readonly name = 'mock';
  readonly capabilities: ProviderCapabilityDescriptor;
  private readonly config: MockProviderConfig;

  constructor(config?: Partial<MockProviderConfig>) {
    this.config = { ...DEFAULT_MOCK_CONFIG, ...config };
    this.capabilities = Object.freeze({
      streaming: false,
      structuredOutput: true,
      maxTokens: 4096,
      supportedCategories: Object.freeze([] as PromptCategory[]),
    });
  }

  async execute(
    envelope: ProviderExecutionEnvelope,
  ): Promise<ProviderResponseEnvelope> {
    if (this.config.simulatedLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.config.simulatedLatencyMs));
    }

    if (this.config.failureMode === 'timeout') {
      await new Promise((_, reject) => setTimeout(reject, this.config.simulatedLatencyMs + 1, new Error('Mock provider timeout')));
    }

    if (this.config.failureMode === 'malformed') {
      return createProviderResponseEnvelope(
        '',
        { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        'error',
      );
    }

    const text = generateDeterministicResponse(envelope.fingerprint);

    if (this.config.failureMode === 'validation_failure') {
      return createProviderResponseEnvelope(
        text,
        { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        'stop',
        undefined,
        { validationFailed: true },
      );
    }

    if (this.config.failureMode === 'partial') {
      const partialText = text.split('\n').slice(0, 5).join('\n');
      return createProviderResponseEnvelope(
        partialText,
        { promptTokens: 100, completionTokens: 25, totalTokens: 125 },
        'length',
        undefined,
        { truncated: true },
      );
    }

    return createProviderResponseEnvelope(
      text,
      { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      'stop',
      { text },
      { source: 'mock' },
    );
  }
}
