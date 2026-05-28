import { RuntimeContext } from './runtime-context.ts';
import { BootstrapError, StartupTimeoutError } from './runtime-errors.ts';

export interface StartupTask {
  name: string;
  dependencies: string[];
  timeout: number;
  execute: (context: RuntimeContext) => Promise<void>;
  rollback?: (context: RuntimeContext) => Promise<void>;
}

export class StartupManager {
  private readonly tasks: StartupTask[] = [];
  private completed: string[] = [];
  private failed: { name: string; error: Error }[] = [];

  constructor(private readonly context: RuntimeContext) {}

  add(task: StartupTask): void { this.tasks.push(task); }

  async start(): Promise<void> {
    this.context.state.transition('STARTING');
    const remaining = new Set(this.tasks.map(t => t.name));
    const taskMap = new Map(this.tasks.map(t => [t.name, t]));

    let prevSize = -1;
    while (remaining.size > 0) {
      if (remaining.size === prevSize) {
        const blocked = [...remaining].filter(n => {
          const t = taskMap.get(n)!;
          return t.dependencies.some(d => remaining.has(d));
        });
        throw new BootstrapError(`Circular or unsatisfied dependencies: ${blocked.join(', ')}`, 'startup');
      }
      prevSize = remaining.size;

      const ready = [...remaining].filter(name => {
        const task = taskMap.get(name)!;
        return task.dependencies.every(d => !remaining.has(d));
      });

      for (const name of ready) {
        remaining.delete(name);
        const task = taskMap.get(name)!;
        try {
          await Promise.race([
            task.execute(this.context),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new StartupTimeoutError(name, task.timeout)), task.timeout)
            ),
          ]);
          this.completed.push(name);
        } catch (err) {
          this.failed.push({ name, error: err instanceof Error ? err : new Error(String(err)) });
          remaining.delete(name);
          if (!task.dependencies.some(d => this.failed.some(f => f.name === d))) {
            // isolate failure but continue if possible
          }
        }
      }
    }

    if (this.failed.length > 0) {
      this.context.state.transition('DEGRADED', `${this.failed.length} tasks failed`);
    } else {
      this.context.state.transition('READY');
    }
  }

  async rollback(): Promise<void> {
    for (const name of [...this.completed].reverse()) {
      const task = this.tasks.find(t => t.name === name);
      if (task?.rollback) {
        try { await task.rollback(this.context); } catch { /* ignore rollback errors */ }
      }
    }
    this.context.state.transition('FAILED');
  }

  get completedTasks(): readonly string[] { return this.completed; }
  get failedTasks(): readonly { name: string; error: Error }[] { return this.failed; }
}
