import type { Step, StepInput, StepOutput, StepContext } from './types.ts';
import { CompositionError } from './errors.ts';

export interface Sequence<TInput, TOutput> extends Step<TInput, TOutput> {
  readonly kind: 'sequence';
  readonly steps: readonly Step[];
}

export interface Parallel<TInput, TOutput> extends Step<TInput, TOutput> {
  readonly kind: 'parallel';
  readonly steps: readonly Step[];
}

export type PredicateFn<T> = (input: T) => boolean;

export interface Conditional<TInput, TOutput> extends Step<TInput, TOutput> {
  readonly kind: 'conditional';
  readonly predicate: PredicateFn<TInput>;
  readonly ifStep: Step<TInput, TOutput>;
  readonly elseStep?: Step<TInput, TOutput>;
}

export interface Map<TInput, TOutput> extends Step<TInput, TOutput> {
  readonly kind: 'map';
  readonly mapper: Step<TInput, TOutput>;
}

export type WorkflowGraph<TInput = unknown, TOutput = unknown> =
  | Sequence<TInput, TOutput>
  | Parallel<TInput, TOutput>
  | Conditional<TInput, TOutput>
  | Map<TInput, TOutput>;

export function sequence<TInput, TOutput>(
  steps: Step[],
  options?: { id?: string; name?: string; description?: string },
): Sequence<TInput, TOutput> {
  if (steps.length === 0) {
    throw new CompositionError('Sequence must contain at least one step');
  }

  const seq: Sequence<TInput, TOutput> = {
    kind: 'sequence',
    id: options?.id ?? `sequence_${Date.now()}`,
    name: options?.name ?? 'Sequence',
    description: options?.description,
    steps,
    async execute(input: StepInput<TInput>, context: StepContext): Promise<StepOutput<TOutput>> {
      let currentInput: StepInput<unknown> = input as StepInput<unknown>;

      for (const step of steps) {
        currentInput = await step.execute(currentInput, context);
      }

      return currentInput as StepOutput<TOutput>;
    },
  };

  return seq;
}

export function parallel<TInput, TOutput>(
  steps: Step[],
  options?: { id?: string; name?: string; description?: string },
): Parallel<TInput, TOutput> {
  if (steps.length === 0) {
    throw new CompositionError('Parallel must contain at least one step');
  }

  const par: Parallel<TInput, TOutput> = {
    kind: 'parallel',
    id: options?.id ?? `parallel_${Date.now()}`,
    name: options?.name ?? 'Parallel',
    description: options?.description,
    steps,
    async execute(input: StepInput<TInput>, context: StepContext): Promise<StepOutput<TOutput>> {
      if (context.signal?.aborted) {
        throw new CompositionError('Workflow aborted before parallel execution');
      }

      const results = await Promise.all(
        steps.map((step) => step.execute(input as StepInput<unknown>, context)),
      );

      const combinedData = results.map((r) => r.data);
      const combinedMetadata: Record<string, unknown> = {};
      for (const r of results) {
        if (r.metadata) {
          Object.assign(combinedMetadata, r.metadata);
        }
      }

      return {
        data: combinedData as TOutput,
        metadata: Object.freeze(combinedMetadata),
      };
    },
  };

  return par;
}

export function conditional<TInput, TOutput>(
  predicate: PredicateFn<TInput>,
  ifStep: Step<TInput, TOutput>,
  elseStep?: Step<TInput, TOutput>,
  options?: { id?: string; name?: string; description?: string },
): Conditional<TInput, TOutput> {
  const cond: Conditional<TInput, TOutput> = {
    kind: 'conditional',
    id: options?.id ?? `conditional_${Date.now()}`,
    name: options?.name ?? 'Conditional',
    description: options?.description,
    predicate,
    ifStep,
    elseStep,
    async execute(input: StepInput<TInput>, context: StepContext): Promise<StepOutput<TOutput>> {
      const conditionResult = predicate(input.data);

      if (conditionResult) {
        return ifStep.execute(input, context);
      }

      if (elseStep) {
        return elseStep.execute(input, context);
      }

      return {
        data: input.data as unknown as TOutput,
        metadata: Object.freeze({ skipped: true }),
      };
    },
  };

  return cond;
}

export function map<TInput, TOutput>(
  mapper: Step<TInput, TOutput>,
  options?: { id?: string; name?: string; description?: string },
): Map<TInput, TOutput> {
  const mapStep: Map<TInput, TOutput> = {
    kind: 'map',
    id: options?.id ?? `map_${Date.now()}`,
    name: options?.name ?? 'Map',
    description: options?.description,
    mapper,
    async execute(input: StepInput<TInput>, context: StepContext): Promise<StepOutput<TOutput>> {
      if (!Array.isArray(input.data)) {
        throw new CompositionError('Map step requires array input');
      }

      if (context.signal?.aborted) {
        throw new CompositionError('Workflow aborted before map execution');
      }

      const items = input.data as TInput[];
      const results = await Promise.all(
        items.map((item) => {
          const stepItem: StepInput<TInput> = { data: item, metadata: Object.freeze({}) };
          return mapper.execute(stepItem, context);
        }),
      );

      const mappedData = results.map((r) => r.data);
      const combinedMetadata: Record<string, unknown> = {};
      for (const r of results) {
        if (r.metadata) {
          Object.assign(combinedMetadata, r.metadata);
        }
      }

      return {
        data: mappedData as TOutput,
        metadata: Object.freeze(combinedMetadata),
      };
    },
  };

  return mapStep;
}
