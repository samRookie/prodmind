import { generateId } from '@prodmind/db';
import { stableStringify } from '../serialization/stable-json.ts';
import { sha256Truncated } from '../fingerprinting/canonical-hash.ts';
import type { RenderedPrompt } from '../templates/template-engine.ts';
import type {
  AnalysisFinding,
  AnalysisRecommendation,
  PromptCategory,
  PromptContextEnvelope,
  PromptEnvelope,
  PromptExecutionRequest,
  ProviderConstraints,
  ProviderExecutionEnvelope,
  ProviderResponseEnvelope,
  StructuredAnalysisResult,
} from '../contracts/prompt-contracts.ts';
import type { PromptDefinition } from '../registry/prompt-registry.ts';
import type { TokenUsage } from '../../contracts/request.ts';

export async function createPromptEnvelope(
  def: PromptDefinition,
  category: PromptCategory,
  variables: Record<string, unknown>,
  rendered: RenderedPrompt,
): Promise<PromptEnvelope> {
  const fingerprint = await sha256Truncated(stableStringify({
    promptId: def.promptId,
    version: def.version,
    renderedFingerprint: rendered.fingerprint,
    category,
  }));
  return Object.freeze({
    id: generateId(),
    promptId: def.promptId,
    category,
    version: def.version,
    template: def.template,
    variables: Object.freeze({ ...variables }),
    rendered: Object.freeze(rendered),
    fingerprint,
  });
}

export async function createPromptContextEnvelope(
  request: PromptExecutionRequest,
): Promise<PromptContextEnvelope> {
  const contextBlocks = request.contextResult.slices.map((slice) => {
    const nodeList = slice.nodes.map((n) => `  - ${n.filePath} (${n.nodeType})`).join('\n');
    return `[${slice.kind}] ${slice.strategy}\n${nodeList}`;
  });
  const tokenCount = request.contextResult.metrics.finalTokenCount;
  const fingerprint = await sha256Truncated(stableStringify({
    contextFingerprint: request.contextResult.fingerprint,
    sliceCount: request.contextResult.slices.length,
    tokenCount,
  }));
  return Object.freeze({
    contextResult: request.contextResult,
    contextBlocks: Object.freeze(contextBlocks),
    tokenCount,
    sliceCount: request.contextResult.slices.length,
    fingerprint,
  });
}

export async function createProviderExecutionEnvelope(
  renderedPrompt: string,
  systemPrompt: string | undefined,
  constraints: ProviderConstraints,
  metadata: Record<string, unknown>,
): Promise<ProviderExecutionEnvelope> {
  const fingerprint = await sha256Truncated(stableStringify({
    renderedLength: renderedPrompt.length,
    constraints,
    metadata,
  }));
  return Object.freeze({
    renderedPrompt,
    systemPrompt,
    constraints: Object.freeze(constraints),
    metadata: Object.freeze(metadata),
    fingerprint,
  });
}

export async function createProviderResponseEnvelope(
  text: string,
  tokenUsage: TokenUsage,
  finishReason: string,
  structured?: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<ProviderResponseEnvelope> {
  const fingerprint = await sha256Truncated(stableStringify({
    text,
    tokenUsage,
    finishReason,
    structured,
  }));
  return Object.freeze({
    text,
    tokenUsage: Object.freeze(tokenUsage),
    finishReason,
    structured: structured ? Object.freeze(structured) : undefined,
    metadata: Object.freeze(metadata ?? {}),
    fingerprint,
  });
}

export function createStructuredAnalysisResult(input: {
  executiveSummary: string;
  findings: AnalysisFinding[];
  recommendations: AnalysisRecommendation[];
  confidence: number;
  traceability?: Record<string, string>;
  metadata?: Record<string, unknown>;
}): StructuredAnalysisResult {
  return Object.freeze({
    executiveSummary: input.executiveSummary,
    findings: Object.freeze(
      [...input.findings].sort((a, b) => {
        const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
        return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
      }),
    ),
    recommendations: Object.freeze(
      [...input.recommendations].sort((a, b) => {
        const priorityOrder = ['critical', 'high', 'medium', 'low'];
        return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
      }),
    ),
    confidence: input.confidence,
    traceability: Object.freeze({ ...input.traceability }),
    metadata: Object.freeze({ ...input.metadata }),
  });
}

export function createEmptyProviderResponseEnvelope(): ProviderResponseEnvelope {
  return Object.freeze({
    text: '',
    tokenUsage: Object.freeze({ promptTokens: 0, completionTokens: 0, totalTokens: 0 }),
    finishReason: 'error',
    metadata: Object.freeze({}),
    fingerprint: 'empty',
  });
}
