export interface PromptConfig {
  readonly provider: string;
  readonly model: string;
  readonly systemPrompt: string;
  readonly promptTemplate: string;
  readonly temperature: number;
  readonly maxTokens: number;
}

export interface TransformConfig {
  readonly expression: string;
  readonly inputMapping: Readonly<Record<string, string>>;
}

export interface DecisionConfig {
  readonly conditions: readonly DecisionCondition[];
  readonly defaultTarget: string;
}

export interface DecisionCondition {
  readonly label: string;
  readonly expression: string;
  readonly targetNode: string;
}

export interface AggregationConfig {
  readonly strategy: 'merge' | 'concat' | 'reduce' | 'select';
  readonly inputSources: readonly string[];
  readonly outputKey: string;
}

export interface ValidationConfig {
  readonly rules: readonly ValidationRule[];
}

export interface ValidationRule {
  readonly field: string;
  readonly constraint: string;
  readonly severity: 'error' | 'warn';
}

export type ExecutionNodeConfig = PromptConfig | TransformConfig | DecisionConfig | AggregationConfig | ValidationConfig;
