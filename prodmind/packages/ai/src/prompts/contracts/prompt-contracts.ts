export enum PromptType {
  ANALYSIS = 'ANALYSIS',
  REVIEW = 'REVIEW',
  SUMMARIZATION = 'SUMMARIZATION',
  GRAPH_REASONING = 'GRAPH_REASONING',
  VALIDATION = 'VALIDATION',
}

export interface PromptContract<TVariables extends Record<string, unknown>> {
  type: PromptType;
  template: string;
  requiredVariables: (keyof TVariables)[];
  optionalVariables: (keyof TVariables)[];
}

export type AnalysisPrompt = PromptContract<{
  code: string;
  language: string;
  context?: string;
}>;

export type ReviewPrompt = PromptContract<{
  code: string;
  criteria: string;
}>;

export type SummarizationPrompt = PromptContract<{
  content: string;
  maxLength: number;
}>;

export type GraphReasoningPrompt = PromptContract<{
  graph: string;
  query: string;
}>;

export type ValidationPrompt = PromptContract<{
  input: string;
  rules: string;
}>;
