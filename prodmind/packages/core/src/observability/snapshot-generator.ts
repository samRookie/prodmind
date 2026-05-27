export interface OperationalSnapshot {
  readonly id: string;
  readonly snapshotType: string;
  readonly timestamp: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

const MAX_PAYLOAD_SIZE = 100 * 1024; // 100 KB

interface InternalOperationalSnapshot {
  id: string;
  snapshotType: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

let snapshotCounter = 0;

function generateSnapshotId(): string {
  snapshotCounter++;
  return `snap-${Date.now()}-${snapshotCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

function approximateSize(obj: Record<string, unknown>): number {
  const raw = JSON.stringify(obj);
  return new TextEncoder().encode(raw).length;
}

export class OperationalSnapshotGenerator {
  private history: InternalOperationalSnapshot[] = [];

  private capture(
    snapshotType: string,
    context: Record<string, unknown>,
  ): OperationalSnapshot {
    const size = approximateSize(context);
    const payload = size > MAX_PAYLOAD_SIZE
      ? { _truncated: true, _originalSize: size, ...context }
      : context;

    const snapshot: InternalOperationalSnapshot = {
      id: generateSnapshotId(),
      snapshotType,
      timestamp: Date.now(),
      payload,
    };

    this.history.push(snapshot);

    return Object.freeze({
      ...snapshot,
      payload: Object.freeze({ ...snapshot.payload }),
    });
  }

  captureRuntimeSnapshot(context: {
    runtimeState: Record<string, unknown>;
  }): OperationalSnapshot {
    return this.capture('runtime', context.runtimeState);
  }

  captureOrchestrationState(context: {
    orchestrationState: Record<string, unknown>;
  }): OperationalSnapshot {
    return this.capture('orchestration', context.orchestrationState);
  }

  captureProviderSummary(context: {
    providerStates: Record<string, unknown>;
  }): OperationalSnapshot {
    return this.capture('provider_summary', context.providerStates);
  }

  captureReplaySummary(context: {
    replayState: Record<string, unknown>;
  }): OperationalSnapshot {
    return this.capture('replay_summary', context.replayState);
  }

  captureGovernanceState(context: {
    governanceState: Record<string, unknown>;
  }): OperationalSnapshot {
    return this.capture('governance', context.governanceState);
  }

  getSnapshotHistory(snapshotType?: string): readonly OperationalSnapshot[] {
    const filtered = snapshotType
      ? this.history.filter((s) => s.snapshotType === snapshotType)
      : [...this.history];

    return filtered.map((s) =>
      Object.freeze({ ...s, payload: Object.freeze({ ...s.payload }) }),
    );
  }

  clear(): void {
    this.history = [];
  }
}
