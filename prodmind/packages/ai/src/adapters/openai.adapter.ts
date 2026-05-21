import type { ProviderCapabilities } from '../contracts/capabilities.ts';
import { DEFAULT_CAPABILITIES } from '../contracts/capabilities.ts';
import type { AIRequest } from '../contracts/request.ts';
import type { AIResponse } from '../contracts/response.ts';
import { ProviderError } from '../errors/provider-error.ts';
import type { ProviderExecutionContext } from '../execution/execution-context.ts';
import type { AIProvider } from '../providers/ai-provider.ts';

export interface OpenAIConfig {
  readonly apiKey?: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly organizationId?: string;
}

export class OpenAIProvider implements AIProvider {
  public readonly name = 'openai';
  public readonly capabilities: ProviderCapabilities;

  public constructor() {
    this.capabilities = {
      ...DEFAULT_CAPABILITIES,
      streaming: true,
      toolCalling: true,
      structuredOutput: true,
      multimodal: true,
      contextWindow: 128_000,
      maxOutputTokens: 4096,
      retrySupport: true,
    };
  }

  public execute(_request: AIRequest, _context?: ProviderExecutionContext): Promise<AIResponse> {
    return Promise.reject(new ProviderError('openai', 'OpenAI provider not yet configured', {
      statusCode: 501,
      code: 'UNKNOWN',
    }));
  }
}
