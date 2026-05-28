import { RuntimeContext } from './runtime-context.ts';
import { ShutdownError } from './runtime-errors.ts';

export interface ShutdownTask {
  name: string;
  priority: number;
  timeout: number;
  execute: () => Promise<void>;
}

export class ShutdownManager {
  private readonly tasks: ShutdownTask[] = [];
  private readonly DEFAULT_TIMEOUT = 10_000;

  constructor(private readonly context: RuntimeContext) {}

  register(name: string, execute: () => Promise<void>, priority = 100, timeout = this.DEFAULT_TIMEOUT): void {
    this.tasks.push({ name, priority, timeout, execute });
  }

  async shutdown(): Promise<void> {
    this.context.state.transition('SHUTTING_DOWN');
    const ordered = [...this.tasks].sort((a, b) => a.priority - b.priority);
    const errors: ShutdownError[] = [];

    for (const task of ordered) {
      try {
        await Promise.race([
          task.execute(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Shutdown timeout for ${task.name}`)), task.timeout)
          ),
        ]);
      } catch (err) {
        errors.push(new ShutdownError(err instanceof Error ? err.message : String(err), task.name));
      }
    }

    this.context.state.transition('FAILED');
    if (errors.length > 0) {
      throw new ShutdownError(
        `${errors.length} shutdown tasks failed`,
        'shutdown-manager',
        { errors: errors.map(e => ({ component: e.component, message: e.message })) }
      );
    }
  }
}
