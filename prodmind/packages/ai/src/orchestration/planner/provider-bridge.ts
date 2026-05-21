import type { ExecutionNode } from '../contracts/execution-contracts.ts';
import type { ExecutionContext, NodeHandler } from '../runtime/node-handler.ts';

export type ProviderFn = (input: ProviderInput) => Promise<ProviderOutput>;

export interface ProviderInput {
  readonly prompt: string;
  readonly system?: string;
  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
}

export interface ProviderOutput {
  readonly text: string;
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
  };
}

export class ProviderExecutionBridge {
  createHandler(provider: ProviderFn, options?: { model?: string; temperature?: number }): NodeHandler {
    return async (node: ExecutionNode, context: ExecutionContext): Promise<Record<string, unknown>> => {
      const prompt = this.extractPrompt(node, context);
      const system = this.extractSystemPrompt(node);

      const output = await provider({
        prompt,
        system: system || undefined,
        model: options?.model,
        temperature: options?.temperature,
      });

      return {
        text: output.text,
        usage: output.usage,
        nodeId: node.id,
      };
    };
  }

  createPassthroughBridge(): NodeHandler {
    return (_node: ExecutionNode, context: ExecutionContext) =>
      Promise.resolve({ ...context.inputs, bridged: true });
  }

  private extractPrompt(node: ExecutionNode, _context: ExecutionContext): string {
    const configPrompt = node.config['prompt'] as string | undefined;
    if (configPrompt) return configPrompt;
    return node.label;
  }

  private extractSystemPrompt(node: ExecutionNode): string {
    return (node.config['system'] as string) ?? '';
  }
}
