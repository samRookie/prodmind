import { InvalidTransitionError } from './errors.ts';

export type GuardFn<TState extends string, TEvent extends string> = (
  from: TState,
  event: TEvent,
) => boolean;

export interface StateTransition<TState extends string, TEvent extends string> {
  readonly from: TState;
  readonly event: TEvent;
  readonly to: TState;
}

export interface StateMachineConfig<TState extends string, TEvent extends string> {
  readonly initialState: TState;
  readonly states: readonly TState[];
  readonly events: readonly TEvent[];
  readonly transitions: readonly StateTransition<TState, TEvent>[];
  readonly guards?: Readonly<Record<string, GuardFn<TState, TEvent>>>;
}

export interface StateMachineSnapshot<TState extends string> {
  readonly currentState: TState;
  readonly allowedEvents: readonly TState[];
}

export class StateMachine<TState extends string, TEvent extends string> {
  private current: TState;
  private readonly config: StateMachineConfig<TState, TEvent>;
  private readonly transitionMap: Map<string, StateTransition<TState, TEvent>>;

  public constructor(config: StateMachineConfig<TState, TEvent>) {
    this.config = config;
    this.current = config.initialState;
    this.transitionMap = new Map();

    for (const t of config.transitions) {
      const key = `${t.from}:${t.event}`;
      this.transitionMap.set(key, t);
    }
  }

  public get currentState(): TState {
    return this.current;
  }

  public canTransition(event: TEvent): boolean {
    const key = `${this.current}:${event}`;
    const transition = this.transitionMap.get(key);
    if (!transition) return false;

    if (this.config.guards) {
      const guardKey = `${this.current}:${event}`;
      const guard = this.config.guards[guardKey];
      if (guard && !guard(this.current, event)) return false;
    }

    return true;
  }

  public transition(event: TEvent): void {
    if (!this.canTransition(event)) {
      throw new InvalidTransitionError(
        this.current as string,
        event as string,
      );
    }

    const key = `${this.current}:${event}`;
    const transition = this.transitionMap.get(key)!;
    this.current = transition.to;
  }

  public snapshot(): StateMachineSnapshot<TState> {
    const allowedEvents: TState[] = [];
    for (const ev of this.config.events) {
      if (this.canTransition(ev)) {
        allowedEvents.push(ev as unknown as TState);
      }
    }

    return Object.freeze({
      currentState: this.current,
      allowedEvents,
    });
  }

  public reset(): void {
    this.current = this.config.initialState;
  }
}
