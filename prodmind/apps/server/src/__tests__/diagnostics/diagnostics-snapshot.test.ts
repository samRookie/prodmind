import { describe, it, expect } from 'vitest';
import { DiagnosticsSnapshotManager } from '../../diagnostics/diagnostics-snapshot.ts';
import { RuntimeDiagnosticsCollector } from '../../diagnostics/runtime-diagnostics.ts';
import { GraphDiagnosticsCollector } from '../../diagnostics/graph-runtime-diagnostics.ts';
import { AiDiagnosticsCollector } from '../../diagnostics/ai-runtime-diagnostics.ts';

describe('DiagnosticsSnapshotManager', () => {
  it('captures snapshot', async () => {
    const m = new DiagnosticsSnapshotManager(new RuntimeDiagnosticsCollector(), new GraphDiagnosticsCollector(), new AiDiagnosticsCollector());
    const s = await m.capture();
    expect(s.fingerprint).toBeTruthy();
    expect(s.system).toBeTruthy();
    expect(s.graph).toBeTruthy();
    expect(s.ai).toBeTruthy();
  });

  it('maintains history', async () => {
    const m = new DiagnosticsSnapshotManager(new RuntimeDiagnosticsCollector(), new GraphDiagnosticsCollector(), new AiDiagnosticsCollector());
    await m.capture();
    await m.capture();
    expect(m.getHistory().length).toBe(2);
  });

  it('clears history', async () => {
    const m = new DiagnosticsSnapshotManager(new RuntimeDiagnosticsCollector(), new GraphDiagnosticsCollector(), new AiDiagnosticsCollector());
    await m.capture();
    m.clear();
    expect(m.getHistory().length).toBe(0);
  });
});
