import type {
  ExecutionConfig,
  PromptExecutionMetrics,
  PromptExecutionRequest,
  PromptExecutionResult,
  PromptFailure,
} from '../contracts/prompt-contracts.ts';
import {
  createPromptContextEnvelope,
  createPromptEnvelope,
  createProviderExecutionEnvelope,
} from '../envelopes/prompt-envelopes.ts';
import { sha256Truncated } from '../fingerprinting/canonical-hash.ts';
import { PromptGovernance } from '../governance/prompt-governance.ts';
import { PromptNormalizer } from '../normalization/prompt-normalizer.ts';
import type { ProviderAdapter } from '../providers/provider-adapter.ts';
import type { PromptRegistry } from '../registry/prompt-registry.ts';
import { ResponseNormalizer } from '../response/response-normalizer.ts';
import { stableStringify } from '../serialization/stable-json.ts';
import { TemplateEngine } from '../templates/template-engine.ts';
import { PromptTracer } from '../tracing/prompt-tracer.ts';
import {
  GovernanceValidationError,
  PromptExecutionError,
  PromptSelectionError,
} from './execution-errors.ts';

const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  maxPromptSize: 32000,
  normalizationRules: {
    trimWhitespace: true,
    sortSections: true,
    maxSections: 50,
  },
  providerConstraints: {
    defaultTimeoutMs: 30000,
    maxRetries: 0,
  },
  executionLimits: {
    maxStageDurationMs: 60000,
  },
  mockProvider: {
    failureMode: 'none' as const,
    simulatedLatencyMs: 5,
  },
};

export class PromptExecutionPipeline {
  private readonly registry: PromptRegistry;
  private readonly templateEngine: TemplateEngine;
  private readonly normalizer: PromptNormalizer;
  private readonly responseNormalizer: ResponseNormalizer;
  private readonly provider: ProviderAdapter;
  private readonly tracer: PromptTracer;
  private readonly governance: PromptGovernance;
  private readonly config: ExecutionConfig;

  constructor(
    registry: PromptRegistry,
    governance: PromptGovernance,
    provider: ProviderAdapter,
    config?: Partial<ExecutionConfig>,
  ) {
    this.registry = registry;
    this.templateEngine = new TemplateEngine();
    this.normalizer = new PromptNormalizer();
    this.responseNormalizer = new ResponseNormalizer();
    this.provider = provider;
    this.tracer = new PromptTracer();
    this.governance = governance;
    this.config = { ...DEFAULT_EXECUTION_CONFIG, ...config };
  }

  async execute(request: PromptExecutionRequest): Promise<PromptExecutionResult> {
    this.tracer.start();
    const startTime = Date.now();
    const stages: string[] = [];

    try {
      this.tracer.record('pipeline_start', { promptId: request.promptId, category: request.category });

      // Stage 1: select
      const selectStart = Date.now();
      const def = await this.registry.getLatest(request.promptId);
      if (!def) throw new PromptSelectionError(request.promptId, `Prompt ${request.promptId} not found`);

      const governanceCheck = await this.governance.validatePromptSelection(request.promptId, request.category);
      if (!governanceCheck.valid) {
        throw new GovernanceValidationError(
          governanceCheck.violations.map((v) => v.message),
        );
      }
      stages.push('select');
      this.tracer.record('select', {
        promptId: request.promptId,
        version: def.version,
        category: request.category,
      }, Date.now() - selectStart);

      // Stage 2: inject
      const injectStart = Date.now();
      const contextEnvelope = await createPromptContextEnvelope(request);
      const templateVars: Record<string, unknown> = {
        snapshotId: request.contextResult.request.snapshotId,
        sliceCount: request.contextResult.slices.length,
        totalTokens: request.contextResult.metrics.finalTokenCount,
        budgetUtilization: request.contextResult.metrics.budgetUtilization,
        contextBlocks: contextEnvelope.contextBlocks.join('\n\n'),
        slices: request.contextResult.slices.map((s) => ({
          kind: s.kind,
          strategy: s.strategy,
          nodeCount: s.nodes.length,
          tokenCount: s.tokenCount,
        })),
        metadata: { ...request.metadata },
      };
      stages.push('inject');
      this.tracer.record('inject', {
        variableCount: Object.keys(templateVars).length,
        contextSliceCount: request.contextResult.slices.length,
      }, Date.now() - injectStart);

      // Stage 3: render
      const renderStart = Date.now();
      const rendered = await this.templateEngine.render(def.template, templateVars);
      stages.push('render');
      this.tracer.record('render', {
        templateLength: def.template.length,
        renderedLength: rendered.text.length,
      }, Date.now() - renderStart);

      // Stage 4: envelope
      const envelopeStart = Date.now();
      const promptEnvelope = await createPromptEnvelope(def, request.category, templateVars, rendered);
      const providerConstraints = {
        maxTokens: this.config.providerConstraints.defaultTimeoutMs,
        allowedCategories: Object.freeze([request.category]),
        timeoutMs: this.config.providerConstraints.defaultTimeoutMs,
      };
      const providerEnvelope = await createProviderExecutionEnvelope(
        rendered.text,
        undefined,
        providerConstraints,
        { category: request.category, promptId: request.promptId },
      );
      stages.push('envelope');
      this.tracer.record('envelope', {
        promptEnvelopeSize: rendered.text.length,
      }, Date.now() - envelopeStart);

      // Stage 5: normalize
      const normalizeStart = Date.now();
      const normalized = await this.normalizer.normalize(rendered.text, this.config.normalizationRules);
      stages.push('normalize');
      const normalizationDuration = Date.now() - normalizeStart;
      this.tracer.record('normalize', {
        originalLength: rendered.text.length,
        normalizedLength: normalized.normalizedText.length,
        tokenEstimate: normalized.tokenEstimate,
      }, normalizationDuration);

      // Stage 6: provider
      const providerStart = Date.now();
      const response = await this.provider.execute(providerEnvelope);
      stages.push('provider');
      const providerLatency = Date.now() - providerStart;
      this.tracer.record('provider', {
        provider: this.provider.name,
        responseLength: response.text.length,
        finishReason: response.finishReason,
      }, providerLatency);

      // Stage 7: normalize_response
      const responseNormStart = Date.now();
      const normalizedResponse = await this.responseNormalizer.normalize(response.text);
      const structuredResult = this.responseNormalizer.toStructuredAnalysis(response.text);
      stages.push('normalize_response');
      this.tracer.record('normalize_response', {
        responseLength: response.text.length,
      }, Date.now() - responseNormStart);

      // Stage 8: finalize
      const totalDuration = Date.now() - startTime;
      const metrics: PromptExecutionMetrics = Object.freeze({
        totalDurationMs: totalDuration,
        selectedPromptId: request.promptId,
        selectedCategory: request.category,
        contextSliceCount: request.contextResult.slices.length,
        contextTokenCount: request.contextResult.metrics.finalTokenCount,
        renderedTokenCount: normalized.tokenEstimate,
        envelopeSizeBytes: new TextEncoder().encode(rendered.text).length,
        providerLatencyMs: providerLatency,
        normalizationDurationMs: normalizationDuration,
        stageCount: stages.length,
      });
      const fingerprint = await sha256Truncated(stableStringify({
        request: { promptId: request.promptId, category: request.category, contextFingerprint: request.contextResult.fingerprint },
        promptEnvelope: promptEnvelope.fingerprint,
        providerEnvelope: providerEnvelope.fingerprint,
        metrics,
      }));
      stages.push('finalize');
      this.tracer.record('finalize', { fingerprint, totalDurationMs: totalDuration });
      const finalTrace = this.tracer.getTrace();

      return Object.freeze({
        request,
        promptEnvelope,
        contextEnvelope,
        providerEnvelope,
        responseEnvelope: response,
        normalizedResponse,
        structuredResult,
        trace: finalTrace,
        metrics,
        fingerprint,
        generatedAt: new Date().toISOString(),
      });

    } catch (error) {
      const totalDuration = Date.now() - startTime;

      let failure: PromptFailure;
      if (error instanceof PromptExecutionError) {
        failure = Object.freeze({
          stage: error.stage,
          code: error.code,
          message: error.message,
          recoverable: false,
        });
      } else {
        failure = Object.freeze({
          stage: 'unknown',
          code: 'UNKNOWN_ERROR',
          message: String(error),
          recoverable: false,
        });
      }

      const metrics: PromptExecutionMetrics = Object.freeze({
        totalDurationMs: totalDuration,
        selectedPromptId: request.promptId,
        selectedCategory: request.category,
        contextSliceCount: request.contextResult.slices.length,
        contextTokenCount: request.contextResult.metrics.finalTokenCount,
        renderedTokenCount: 0,
        envelopeSizeBytes: 0,
        providerLatencyMs: 0,
        normalizationDurationMs: 0,
        stageCount: stages.length,
        failure,
      });

      const errorTrace = this.tracer.getTrace();
      const contextEnvelope = await createPromptContextEnvelope(request).catch(() => null);
      const errFingerprint = await sha256Truncated(stableStringify({ error: failure.code }));

      throw Object.freeze({
        request,
        promptEnvelope: null as never,
        contextEnvelope: contextEnvelope ?? null,
        providerEnvelope: null as never,
        responseEnvelope: null as never,
        normalizedResponse: null as never,
        structuredResult: null as never,
        trace: errorTrace,
        metrics,
        fingerprint: errFingerprint,
        generatedAt: new Date().toISOString(),
      });
    }
  }
}
