export enum ProviderCapability {
  STREAMING = 'STREAMING',
  TOOL_CALLING = 'TOOL_CALLING',
  STRUCTURED_OUTPUT = 'STRUCTURED_OUTPUT',
  MULTIMODAL = 'MULTIMODAL',
  RETRY_SUPPORT = 'RETRY_SUPPORT',
}

export interface ProviderCapabilities {
  readonly streaming: boolean;
  readonly toolCalling: boolean;
  readonly structuredOutput: boolean;
  readonly multimodal: boolean;
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
  readonly retrySupport: boolean;
}

export const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  streaming: false,
  toolCalling: false,
  structuredOutput: false,
  multimodal: false,
  contextWindow: 0,
  maxOutputTokens: 0,
  retrySupport: false,
};
