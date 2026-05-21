import type { ProviderCapabilities } from '../contracts/capabilities.ts';
import { DEFAULT_CAPABILITIES } from '../contracts/capabilities.ts';
import type { AIRequest, TokenUsage } from '../contracts/request.ts';
import type { AIResponse, FinishReason } from '../contracts/response.ts';
import { createResponse } from '../contracts/response.ts';
import { RetryableError } from '../errors/provider-error.ts';
import type { ProviderExecutionContext } from '../execution/execution-context.ts';
import type { AIProvider } from '../providers/ai-provider.ts';

export interface MockProviderConfig {
  readonly apiKey?: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly seed: number;
  readonly delayMs: number;
  readonly simulatedTokenUsage: TokenUsage;
  readonly failureRate: number;
  readonly consecutiveFailures: number;
}

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MockProvider implements AIProvider {
  public readonly name = 'mock';
  public readonly capabilities: ProviderCapabilities;
  private readonly config: MockProviderConfig;
  private readonly rng: () => number;
  private callCount = 0;

  public constructor(config: MockProviderConfig) {
    this.config = config;
    this.rng = mulberry32(config.seed);

    this.capabilities = {
      ...DEFAULT_CAPABILITIES,
      streaming: true,
      toolCalling: true,
      structuredOutput: true,
      multimodal: false,
      contextWindow: 128_000,
      maxOutputTokens: 4096,
      retrySupport: true,
    };
  }

  public async execute(request: AIRequest, _context?: ProviderExecutionContext): Promise<AIResponse> {
    this.callCount++;

    if (this.config.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delayMs));
    }

    if (this.callCount <= this.config.consecutiveFailures) {
      throw new RetryableError('mock', `Simulated failure ${this.callCount}/${this.config.consecutiveFailures}`, {
        statusCode: 500,
        code: 'SERVER_ERROR',
      });
    }

    if (this.rng() < this.config.failureRate) {
      throw new RetryableError('mock', 'Simulated random failure', {
        statusCode: 429,
        code: 'RATE_LIMIT',
      });
    }

    const finishReasons: FinishReason[] = ['stop', 'length', 'tool_calls'];
    const finishReason: FinishReason = finishReasons[Math.floor(this.rng() * finishReasons.length)] ?? 'stop';

    const text = `Mock response [correlationId=${request.correlationId}]`;

    return createResponse({
      text,
      tokenUsage: this.config.simulatedTokenUsage,
      latencyMs: this.config.delayMs,
      provider: 'mock',
      model: this.config.model,
      finishReason: finishReason === 'tool_calls' ? 'stop' : finishReason ?? 'stop',
      toolCalls: finishReason === 'tool_calls' ? [{ id: 'mock-tool-call', type: 'function' }] : undefined,
    });
  }

  public async *executeStream(request: AIRequest, context?: ProviderExecutionContext): AsyncIterable<AIResponse> {
    const response = await this.execute(request, context);
    for (const char of response.text) {
      yield createResponse({
        text: char,
        tokenUsage: { promptTokens: 0, completionTokens: 1, totalTokens: 1 },
        latencyMs: 0,
        provider: 'mock',
        model: this.config.model,
        finishReason: 'stop',
      });
    }
  }

  public resetCallCount(): void {
    this.callCount = 0;
  }
}
