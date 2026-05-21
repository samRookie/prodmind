import { StateMachine } from '../../orchestration/state-machine.ts';
import type { RuntimeLifecycleEntry, RuntimeLifecycleStage } from '../contracts/runtime-contracts.ts';
import { createRuntimeLifecycleEntry } from '../contracts/runtime-contracts.ts';

const LIFECYCLE_TRANSITIONS: Array<{ from: RuntimeLifecycleStage; event: string; to: RuntimeLifecycleStage }> = [
  { from: 'CREATED', event: 'QUEUE', to: 'QUEUED' },
  { from: 'QUEUED', event: 'VALIDATE', to: 'VALIDATED' },
  { from: 'QUEUED', event: 'FAIL', to: 'FAILED' },
  { from: 'QUEUED', event: 'CANCEL', to: 'CANCELLED' },
  { from: 'VALIDATED', event: 'SCHEDULE', to: 'SCHEDULED' },
  { from: 'VALIDATED', event: 'FAIL', to: 'FAILED' },
  { from: 'SCHEDULED', event: 'EXECUTE', to: 'EXECUTING' },
  { from: 'SCHEDULED', event: 'FAIL', to: 'FAILED' },
  { from: 'SCHEDULED', event: 'CANCEL', to: 'CANCELLED' },
  { from: 'EXECUTING', event: 'RETRY', to: 'RETRYING' },
  { from: 'EXECUTING', event: 'NORMALIZE', to: 'NORMALIZING' },
  { from: 'EXECUTING', event: 'FAIL', to: 'FAILED' },
  { from: 'EXECUTING', event: 'CANCEL', to: 'CANCELLED' },
  { from: 'RETRYING', event: 'EXECUTE', to: 'EXECUTING' },
  { from: 'RETRYING', event: 'FAIL', to: 'FAILED' },
  { from: 'RETRYING', event: 'CANCEL', to: 'CANCELLED' },
  { from: 'NORMALIZING', event: 'VALIDATE', to: 'VALIDATING' },
  { from: 'NORMALIZING', event: 'FAIL', to: 'FAILED' },
  { from: 'VALIDATING', event: 'COMPLETE', to: 'COMPLETED' },
  { from: 'VALIDATING', event: 'FAIL', to: 'FAILED' },
  { from: 'COMPLETED', event: 'REPLAY', to: 'REPLAYED' },
  { from: 'FAILED', event: 'REPLAY', to: 'REPLAYED' },
];

export class RuntimeLifecycle {
  private readonly fsm: StateMachine<RuntimeLifecycleStage, string>;
  private readonly history: RuntimeLifecycleEntry[] = [];
  private stageStartTime = 0;

  constructor() {
    this.fsm = new StateMachine<RuntimeLifecycleStage, string>({
      initialState: 'CREATED',
      states: Object.freeze([
        'CREATED', 'QUEUED', 'VALIDATED', 'SCHEDULED', 'EXECUTING', 'RETRYING',
        'NORMALIZING', 'VALIDATING', 'COMPLETED', 'FAILED', 'REPLAYED', 'CANCELLED',
      ]),
      events: Object.freeze(['QUEUE', 'VALIDATE', 'SCHEDULE', 'EXECUTE', 'RETRY', 'NORMALIZE', 'COMPLETE', 'FAIL', 'CANCEL', 'REPLAY']),
      transitions: Object.freeze(LIFECYCLE_TRANSITIONS),
    });
    this.stageStartTime = Date.now();
    this.recordEntry();
  }

  get stage(): RuntimeLifecycleStage {
    return this.fsm.currentState;
  }

  get isTerminal(): boolean {
    return ['COMPLETED', 'FAILED', 'REPLAYED', 'CANCELLED'].includes(this.fsm.currentState);
  }

  queue(): void { this.transition('QUEUE'); }
  validate(): void { this.transition('VALIDATE'); }
  schedule(): void { this.transition('SCHEDULE'); }
  execute(): void { this.transition('EXECUTE'); }
  retry(): void { this.transition('RETRY'); }
  normalize(): void { this.transition('NORMALIZE'); }
  validating(): void { this.transition('VALIDATE'); }
  complete(): void { this.transition('COMPLETE'); }
  fail(): void { this.transition('FAIL'); }
  cancel(): void { this.transition('CANCEL'); }
  replay(): void { this.transition('REPLAY'); }

  getHistory(): readonly RuntimeLifecycleEntry[] {
    return Object.freeze([...this.history]);
  }

  canTransition(event: string): boolean {
    return this.fsm.canTransition(event);
  }

  private transition(event: string): void {
    if (!this.fsm.canTransition(event)) return;
    const prevStage = this.fsm.currentState;
    this.fsm.transition(event);
    this.recordEntry(prevStage);
  }

  private recordEntry(previousStage?: RuntimeLifecycleStage): void {
    const now = Date.now();
    const duration = this.stageStartTime > 0 ? now - this.stageStartTime : 0;
    this.history.push(createRuntimeLifecycleEntry({
      stage: previousStage ?? this.fsm.currentState,
      durationMs: duration,
      metadata: { previousStage },
    }));
    this.stageStartTime = now;
  }
}
