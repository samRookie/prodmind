import type { ProviderCapabilities } from '../contracts/capabilities.ts';
import { DEFAULT_CAPABILITIES } from '../contracts/capabilities.ts';
import type { AIRequest } from '../contracts/request.ts';
import type { AIResponse } from '../contracts/response.ts';
import { ProviderError } from '../errors/provider-error.ts';
import type { ProviderExecutionContext } from '../execution/execution-context.ts';
import type { AIProvider } from '../providers/ai-provider.ts';

export type AnthropicConfig = {
  readonly apiKey?: string;
  readonly model: string;
  readonly timeoutMs: number;
};

export class AnthropicProvider implements AIProvider {
  public readonly name = 'anthropic';
  public readonly capabilities: ProviderCapabilities;

  public constructor() {
    this.capabilities = {
      ...DEFAULT_CAPABILITIES,
      streaming: true,
      toolCalling: true,
      structuredOutput: false,
      multimodal: true,
      contextWindow: 200_000,
      maxOutputTokens: 4096,
      retrySupport: true,
    };
  }

  public execute(_request: AIRequest, _context?: ProviderExecutionContext): Promise<AIResponse> {
    return Promise.reject(new ProviderError('anthropic', 'Anthropic provider not yet configured', {
      statusCode: 501,
      code: 'UNKNOWN',
    }));
  }
}
