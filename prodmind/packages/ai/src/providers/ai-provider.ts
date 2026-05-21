import type { ProviderCapabilities } from '../contracts/capabilities.ts';
import type { AIRequest } from '../contracts/request.ts';
import type { AIResponse } from '../contracts/response.ts';
import type { ProviderExecutionContext } from '../execution/execution-context.ts';

export interface AIProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  execute(request: AIRequest, context?: ProviderExecutionContext): Promise<AIResponse>;

  executeStream?(request: AIRequest, context?: ProviderExecutionContext): AsyncIterable<AIResponse>;
}
