import type { ContextAssemblyResult } from '../../context/contracts.ts';
import type { TokenUsage } from '../../contracts/request.ts';
import type { RenderedPrompt } from '../templates/template-engine.ts';

export enum PromptType {
  ANALYSIS = 'ANALYSIS',
  REVIEW = 'REVIEW',
  SUMMARIZATION = 'SUMMARIZATION',
  GRAPH_REASONING = 'GRAPH_REASONING',
  VALIDATION = 'VALIDATION',
}

export type PromptCategory =
  | 'architecture_review'
  | 'scalability_analysis'
  | 'resilience_analysis'
  | 'coupling_analysis'
  | 'dependency_analysis'
  | 'production_readiness_review'
  | 'blast_radius_reasoning'
  | 'graph_explanation'
  | 'repository_summarization'
  | 'engineering_diagnostics';

export const PROMPT_CATEGORIES: readonly PromptCategory[] = [
  'architecture_review',
  'scalability_analysis',
  'resilience_analysis',
  'coupling_analysis',
  'dependency_analysis',
  'production_readiness_review',
  'blast_radius_reasoning',
  'graph_explanation',
  'repository_summarization',
  'engineering_diagnostics',
];

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

export interface PromptExecutionRequest {
  readonly promptId: string;
  readonly category: PromptCategory;
  readonly contextResult: ContextAssemblyResult;
  readonly configOverrides?: Partial<ExecutionConfig>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ExecutionConfig {
  readonly maxPromptSize: number;
  readonly normalizationRules: {
    readonly trimWhitespace: boolean;
    readonly sortSections: boolean;
    readonly maxSections: number;
  };
  readonly providerConstraints: {
    readonly defaultTimeoutMs: number;
    readonly maxRetries: number;
  };
  readonly executionLimits: {
    readonly maxStageDurationMs: number;
  };
  readonly mockProvider: {
    readonly failureMode: 'none' | 'timeout' | 'malformed' | 'validation_failure' | 'partial';
    readonly simulatedLatencyMs: number;
  };
}

export interface PromptTraceEntry {
  readonly operation: string;
  readonly timestamp: string;
  readonly details: Readonly<Record<string, unknown>>;
  readonly durationMs: number;
}

export interface PromptTrace {
  readonly entries: readonly PromptTraceEntry[];
  readonly totalDurationMs: number;
  readonly operationCount: number;
}

export interface PromptFailure {
  readonly stage: string;
  readonly code: string;
  readonly message: string;
  readonly recoverable: boolean;
}

export interface PromptExecutionMetrics {
  readonly totalDurationMs: number;
  readonly selectedPromptId: string;
  readonly selectedCategory: PromptCategory;
  readonly contextSliceCount: number;
  readonly contextTokenCount: number;
  readonly renderedTokenCount: number;
  readonly envelopeSizeBytes: number;
  readonly providerLatencyMs: number;
  readonly normalizationDurationMs: number;
  readonly stageCount: number;
  readonly failure?: PromptFailure;
}

export interface PromptEnvelope {
  readonly id: string;
  readonly promptId: string;
  readonly category: PromptCategory;
  readonly version: number;
  readonly template: string;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly rendered: RenderedPrompt;
  readonly fingerprint: string;
}

export interface PromptContextEnvelope {
  readonly contextResult: ContextAssemblyResult;
  readonly contextBlocks: readonly string[];
  readonly tokenCount: number;
  readonly sliceCount: number;
  readonly fingerprint: string;
}

export interface ProviderConstraints {
  readonly maxTokens: number;
  readonly allowedCategories: readonly PromptCategory[];
  readonly timeoutMs: number;
}

export interface ProviderExecutionEnvelope {
  readonly renderedPrompt: string;
  readonly systemPrompt?: string;
  readonly constraints: ProviderConstraints;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly fingerprint: string;
}

export interface ProviderResponseEnvelope {
  readonly text: string;
  readonly structured?: Readonly<Record<string, unknown>>;
  readonly tokenUsage: TokenUsage;
  readonly finishReason: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly fingerprint: string;
}

export interface NormalizedPromptResult {
  readonly normalizedText: string;
  readonly sections: readonly string[];
  readonly fingerprint: string;
  readonly tokenEstimate: number;
}

export interface AnalysisFinding {
  readonly category: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  readonly title: string;
  readonly description: string;
  readonly location?: string;
  readonly recommendation?: string;
}

export interface AnalysisRecommendation {
  readonly priority: 'critical' | 'high' | 'medium' | 'low';
  readonly action: string;
  readonly rationale: string;
}

export interface StructuredAnalysisResult {
  readonly executiveSummary: string;
  readonly findings: readonly AnalysisFinding[];
  readonly recommendations: readonly AnalysisRecommendation[];
  readonly confidence: number;
  readonly traceability: Readonly<Record<string, string>>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface PromptExecutionResult {
  readonly request: PromptExecutionRequest;
  readonly promptEnvelope: PromptEnvelope;
  readonly contextEnvelope: PromptContextEnvelope;
  readonly providerEnvelope: ProviderExecutionEnvelope;
  readonly responseEnvelope: ProviderResponseEnvelope;
  readonly normalizedResponse: NormalizedPromptResult;
  readonly structuredResult: StructuredAnalysisResult | null;
  readonly trace: PromptTrace;
  readonly metrics: PromptExecutionMetrics;
  readonly fingerprint: string;
  readonly generatedAt: string;
}
