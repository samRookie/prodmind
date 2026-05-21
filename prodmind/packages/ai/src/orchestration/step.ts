import type { AIRequest } from '../contracts/request.ts';
import { createRequest } from '../contracts/request.ts';
import type { AIResponse } from '../contracts/response.ts';
import { createResponse } from '../contracts/response.ts';
import type { ProviderExecutionContext } from '../execution/execution-context.ts';
import { createExecutionContext } from '../execution/execution-context.ts';
import type { ExecutionSnapshot } from '../execution-history/execution-snapshot.ts';
import { createExecutionSnapshot } from '../execution-history/execution-snapshot.ts';
import { ExecutionStore } from '../execution-history/execution-store.ts';
import type { AIProvider } from '../providers/ai-provider.ts';
import type { RetryPolicy } from '../retries/retry-policy.ts';
import { executeWithRetry } from '../retries/retry-policy.ts';
import { DEFAULT_RETRY_POLICY } from '../retries/retry-policy.ts';
import { StepExecutionError } from './errors.ts';
import type { Step, StepContext,StepInput, StepOutput } from './types.ts';
import { createStepOutput } from './types.ts';

export class AIProviderStep implements Step<string, AIResponse> {
  public readonly id: string;
  public readonly name: string;
  public readonly description?: string;
  private readonly provider: AIProvider;
  private readonly systemPrompt?: string;
  private readonly temperature?: number;
  private readonly maxTokens?: number;
  private readonly additionalParams?: Record<string, unknown>;

  public constructor(config: {
    id: string;
    name: string;
    description?: string;
    provider: AIProvider;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    additionalParams?: Record<string, unknown>;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.provider = config.provider;
    this.systemPrompt = config.systemPrompt;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
    this.additionalParams = config.additionalParams;
  }

  public async execute(input: StepInput<string>, context: StepContext): Promise<StepOutput<AIResponse>> {
    const providerContext: ProviderExecutionContext = createExecutionContext({
      provider: this.provider.name,
      model: this.provider.name,
      stage: 'orchestration',
      operationId: context.workflowId,
      executionId: context.executionId,
      traceId: context.traceId,
      deterministic: true,
      signal: context.signal,
    });

    const request: AIRequest = createRequest({
      prompt: input.data,
      systemPrompt: this.systemPrompt,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      correlationId: context.executionId,
      ...(this.additionalParams as Record<string, unknown>),
    });

    try {
      const { data: response } = await executeWithRetry(
        () => this.provider.execute(request, providerContext),
        DEFAULT_RETRY_POLICY,
        context.signal,
      );

      return createStepOutput(response, {
        stepId: this.id,
        provider: this.provider.name,
      });
    } catch (error) {
      throw new StepExecutionError(
        this.id,
        error instanceof Error ? error.message : String(error),
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }
}

export class TransformStep<TInput, TOutput> implements Step<TInput, TOutput> {
  public readonly id: string;
  public readonly name: string;
  public readonly description?: string;
  private readonly transform: (data: TInput) => TOutput;

  public constructor(config: {
    id: string;
    name: string;
    description?: string;
    transform: (data: TInput) => TOutput;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.transform = config.transform;
  }

  public execute(input: StepInput<TInput>, _context: StepContext): Promise<StepOutput<TOutput>> {
    const result = this.transform(input.data);
    return Promise.resolve(createStepOutput(result, { stepId: this.id }));
  }
}

export class RetryStep<TInput, TOutput> implements Step<TInput, TOutput> {
  public readonly id: string;
  public readonly name: string;
  public readonly description?: string;
  private readonly inner: Step<TInput, TOutput>;
  private readonly policy: RetryPolicy;

  public constructor(config: {
    id: string;
    name: string;
    description?: string;
    step: Step<TInput, TOutput>;
    policy?: RetryPolicy;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.inner = config.step;
    this.policy = config.policy ?? DEFAULT_RETRY_POLICY;
  }

  public async execute(input: StepInput<TInput>, context: StepContext): Promise<StepOutput<TOutput>> {
    const { data } = await executeWithRetry(
      () => this.inner.execute(input, context),
      this.policy,
      context.signal,
    );
    return data;
  }
}

export class SnapshotStep<TInput, TOutput> implements Step<TInput, TOutput> {
  public readonly id: string;
  public readonly name: string;
  public readonly description?: string;
  private readonly inner: Step<TInput, TOutput>;
  private readonly store: ExecutionStore;

  public constructor(config: {
    id: string;
    name: string;
    description?: string;
    step: Step<TInput, TOutput>;
    store?: ExecutionStore;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.inner = config.step;
    this.store = config.store ?? new ExecutionStore();
  }

  public async execute(input: StepInput<TInput>, context: StepContext): Promise<StepOutput<TOutput>> {
    const innerResult = await this.inner.execute(input, context);

    const snapshot = await createExecutionSnapshot({
      correlationId: context.executionId,
      provider: 'orchestration',
      model: 'step',
      renderedPrompt: JSON.stringify(input.data),
      executionParams: {
        stepId: this.id,
        workflowId: context.workflowId,
        traceId: context.traceId,
      },
      response: innerResult.data && typeof innerResult.data === 'object'
        ? createResponse({
            text: JSON.stringify(innerResult.data),
            tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            latencyMs: 0,
            provider: 'orchestration',
            model: 'step',
            finishReason: 'stop',
          })
        : undefined,
      status: 'success',
    });

    await this.store.save(snapshot);

    return innerResult;
  }
}

export class ReplayVerifyStep<TInput, TOutput> implements Step<TInput, TOutput> {
  public readonly id: string;
  public readonly name: string;
  public readonly description?: string;
  private readonly inner: Step<TInput, TOutput>;
  private readonly originalSnapshot: ExecutionSnapshot;

  public constructor(config: {
    id: string;
    name: string;
    description?: string;
    step: Step<TInput, TOutput>;
    originalSnapshot: ExecutionSnapshot;
  }) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.inner = config.step;
    this.originalSnapshot = config.originalSnapshot;
  }

  public async execute(input: StepInput<TInput>, context: StepContext): Promise<StepOutput<TOutput>> {
    const result = await this.inner.execute(input, context);

    const outputText = typeof result.data === 'string'
      ? result.data
      : JSON.stringify(result.data);

    const storedText = this.originalSnapshot.response?.text ?? '';

    if (outputText !== storedText) {
      throw new StepExecutionError(
        this.id,
        'Replay verification failed: output divergence detected',
        {
          details: {
            expected: storedText.slice(0, 200),
            actual: outputText.slice(0, 200),
          },
        },
      );
    }

    return result;
  }
}
