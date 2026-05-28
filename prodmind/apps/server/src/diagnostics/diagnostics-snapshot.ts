import { createHash } from 'node:crypto';
import { RuntimeDiagnosticsCollector, type SystemDiagnostics } from './runtime-diagnostics.ts';
import { GraphDiagnosticsCollector, type GraphRuntimeDiagnostics } from './graph-runtime-diagnostics.ts';
import { AiDiagnosticsCollector, type AiRuntimeDiagnostics } from './ai-runtime-diagnostics.ts';
import { DiagnosticsSnapshotError } from './diagnostics-errors.ts';

export interface DiagnosticsSnapshot {
  system: SystemDiagnostics;
  graph: GraphRuntimeDiagnostics;
  ai: AiRuntimeDiagnostics;
  fingerprint: string;
  timestamp: string;
}

export class DiagnosticsSnapshotManager {
  private snapshots: DiagnosticsSnapshot[] = [];
  private readonly maxSnapshots = 50;

  constructor(
    private readonly runtimeCollector: RuntimeDiagnosticsCollector,
    private readonly graphCollector: GraphDiagnosticsCollector,
    private readonly aiCollector: AiDiagnosticsCollector,
  ) {}

  async capture(): Promise<DiagnosticsSnapshot> {
    try {
      const system = await this.runtimeCollector.collect();
      const graph = this.graphCollector.collect();
      const ai = this.aiCollector.collect();

      const raw = { system, graph, ai };
      const fingerprint = createHash('sha256')
        .update(JSON.stringify(raw))
        .digest('hex');

      const snapshot: DiagnosticsSnapshot = {
        ...raw,
        fingerprint,
        timestamp: new Date().toISOString(),
      };

      this.snapshots.push(snapshot);
      if (this.snapshots.length > this.maxSnapshots) {
        this.snapshots = this.snapshots.slice(-this.maxSnapshots);
      }

      return snapshot;
    } catch (err) {
      throw new DiagnosticsSnapshotError(
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  getHistory(): readonly DiagnosticsSnapshot[] {
    return this.snapshots;
  }

  getLatest(): DiagnosticsSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  clear(): void {
    this.snapshots = [];
  }
}
