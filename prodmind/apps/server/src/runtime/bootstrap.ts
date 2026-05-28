import { createHash } from 'node:crypto';
import { RuntimeContext } from './runtime-context.ts';
import { StartupManager } from './startup-manager.ts';
import { ShutdownManager } from './shutdown-manager.ts';
import { BootstrapError } from './runtime-errors.ts';

export interface BootstrapConfig {
  startupTimeout?: number;
  shutdownTimeout?: number;
}

export class RuntimeBootstrap {
  public readonly context: RuntimeContext;
  public readonly startup: StartupManager;
  public readonly shutdown: ShutdownManager;
  private readonly fingerprint: string;

  constructor(_config?: BootstrapConfig) {
    this.context = new RuntimeContext();
    this.startup = new StartupManager(this.context);
    this.shutdown = new ShutdownManager(this.context);
    this.fingerprint = createHash('sha256')
      .update(`runtime-bootstrap-${Date.now()}`)
      .digest('hex');
  }

  async initialize(): Promise<RuntimeContext> {
    try {
      await this.startup.start();
      this.context.register('runtime_fingerprint', this.fingerprint);
      return this.context;
    } catch (err) {
      await this.startup.rollback();
      throw new BootstrapError(
        err instanceof Error ? err.message : String(err),
        'runtime-bootstrap'
      );
    }
  }

  async destroy(): Promise<void> {
    await this.shutdown.shutdown();
  }

  getFingerprint(): string {
    return this.fingerprint;
  }
}
