import { collectMemoryDiagnostics, type MemoryDiagnostics } from './memory-diagnostics.ts';
import { collectEventLoopDiagnostics, type EventLoopDiagnostics } from './eventloop-diagnostics.ts';
import { DiagnosticsCollectionError } from './diagnostics-errors.ts';

export interface SystemDiagnostics {
  memory: MemoryDiagnostics;
  eventLoop: EventLoopDiagnostics | null;
  uptimeSeconds: number;
  platform: string;
  nodeVersion: string;
  cpuUsage: { user: number; system: number };
  timestamp: string;
}

export class RuntimeDiagnosticsCollector {
  private _history: SystemDiagnostics[] = [];
  private readonly maxHistory = 100;

  async collect(): Promise<SystemDiagnostics> {
    try {
      const memory = collectMemoryDiagnostics();
      const eventLoop = await collectEventLoopDiagnostics().catch(() => null);
      const cpuUsage = process.cpuUsage();

      const diagnostics: SystemDiagnostics = {
        memory,
        eventLoop,
        uptimeSeconds: Math.floor(process.uptime()),
        platform: process.platform,
        nodeVersion: process.version,
        cpuUsage: { user: Math.round(cpuUsage.user / 1000), system: Math.round(cpuUsage.system / 1000) },
        timestamp: new Date().toISOString(),
      };

      this._history.push(diagnostics);
      if (this._history.length > this.maxHistory) {
        this._history = this._history.slice(-this.maxHistory);
      }

      return diagnostics;
    } catch (err) {
      throw new DiagnosticsCollectionError(
        'runtime',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  getHistory(): readonly SystemDiagnostics[] {
    return this._history;
  }

  getLatest(): SystemDiagnostics | undefined {
    return this._history[this._history.length - 1];
  }

  clearHistory(): void {
    this._history = [];
  }
}
