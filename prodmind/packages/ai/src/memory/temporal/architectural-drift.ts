import type { GraphMemory, MetricsMemory } from '../contracts/memory-contracts.ts';

export interface DriftReport {
  readonly snapshotPair: { previous: string; current: string };
  readonly nodeDelta: number;
  readonly edgeDelta: number;
  readonly densityDelta: number;
  readonly sccDelta: number;
  readonly instabilityDelta: number;
  readonly propagationRiskDelta: number;
  readonly volatilityDelta: number;
  readonly driftMagnitude: number;
}

export class ArchitecturalDrift {
  compareGraphs(previous: GraphMemory, current: GraphMemory): DriftReport {
    const nodeDelta = current.nodeCount - previous.nodeCount;
    const edgeDelta = current.edgeCount - previous.edgeCount;
    const densityDelta = current.density - previous.density;
    const sccDelta = current.sccCount - previous.sccCount;

    const driftMagnitude = Math.sqrt(
      Math.pow(nodeDelta, 2) +
      Math.pow(edgeDelta, 2) +
      Math.pow(densityDelta * 100, 2) +
      Math.pow(sccDelta, 2),
    );

    return Object.freeze({
      snapshotPair: { previous: previous.snapshotId, current: current.snapshotId },
      nodeDelta,
      edgeDelta,
      densityDelta,
      sccDelta,
      instabilityDelta: 0,
      propagationRiskDelta: 0,
      volatilityDelta: 0,
      driftMagnitude,
    });
  }

  compareMetrics(previous: MetricsMemory, current: MetricsMemory): DriftReport {
    const instabilityDelta = current.instability - previous.instability;
    const propagationRiskDelta = current.propagationRisk - previous.propagationRisk;
    const volatilityDelta = current.volatility - previous.volatility;

    const driftMagnitude = Math.sqrt(
      Math.pow(instabilityDelta * 100, 2) +
      Math.pow(propagationRiskDelta * 100, 2) +
      Math.pow(volatilityDelta * 100, 2),
    );

    return Object.freeze({
      snapshotPair: { previous: previous.snapshotId, current: current.snapshotId },
      nodeDelta: 0,
      edgeDelta: 0,
      densityDelta: 0,
      sccDelta: 0,
      instabilityDelta,
      propagationRiskDelta,
      volatilityDelta,
      driftMagnitude,
    });
  }

  classifyDrift(report: DriftReport): 'stable' | 'minor' | 'significant' | 'critical' {
    if (report.driftMagnitude > 50) return 'critical';
    if (report.driftMagnitude > 20) return 'significant';
    if (report.driftMagnitude > 5) return 'minor';
    return 'stable';
  }
}
