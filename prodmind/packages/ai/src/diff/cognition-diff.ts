import type { ArchitectureDiff, DiffInput } from './diff-types.ts';
import { buildDiff } from './diff-engine.ts';

export function detectSccChanges(input: DiffInput): ArchitectureDiff[] {
  const diffs: ArchitectureDiff[] = [];
  const prev = input.previousSccData;
  const curr = input.currentSccData;
  if (!prev || !curr) return diffs;

  const prevComponents = new Map(prev.componentNodes);
  const currComponents = new Map(curr.componentNodes);

  for (const [compId, currNodes] of currComponents) {
    const prevNodes = prevComponents.get(compId) ?? [];
    if (currNodes.length > prevNodes.length) {
      diffs.push(buildDiff({
        diffType: 'SCC_EXPANDED', severity: currNodes.length > 5 ? 'CRITICAL' : 'HIGH',
        previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
        impactedNodes: currNodes, evidence: [{ metricType: 'SCC_SIZE', previousValue: prevNodes.length, currentValue: currNodes.length, delta: currNodes.length - prevNodes.length, description: `SCC component ${compId} grew from ${prevNodes.length} to ${currNodes.length} nodes` }],
        metadata: { componentId: compId, prevSize: prevNodes.length, currSize: currNodes.length },
      }));
    } else if (currNodes.length < prevNodes.length) {
      diffs.push(buildDiff({
        diffType: 'SCC_REDUCED', severity: 'MODERATE',
        previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
        impactedNodes: prevNodes, evidence: [{ metricType: 'SCC_SIZE', previousValue: prevNodes.length, currentValue: currNodes.length, delta: currNodes.length - prevNodes.length, description: `SCC component ${compId} shrank from ${prevNodes.length} to ${currNodes.length} nodes` }],
        metadata: { componentId: compId, prevSize: prevNodes.length, currSize: currNodes.length },
      }));
    }
  }
  return diffs;
}

export function detectRiskChanges(input: DiffInput): ArchitectureDiff[] {
  const diffs: ArchitectureDiff[] = [];
  const prevRisks = input.previousRisks ?? [];
  const currRisks = input.currentRisks ?? [];
  const prevMap = new Map(prevRisks.map(r => [r.riskType, r]));
  const currMap = new Map(currRisks.map(r => [r.riskType, r]));

  for (const [riskType, curr] of currMap) {
    const prev = prevMap.get(riskType);
    if (prev && curr.normalizedScore > prev.normalizedScore + 0.05) {
      diffs.push(buildDiff({
        diffType: 'RISK_INCREASED', severity: curr.normalizedScore >= 0.8 ? 'CRITICAL' : 'HIGH',
        previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
        impactedNodes: curr.impactedNodes,
        impactedRisks: [riskType],
        evidence: [{ metricType: 'RISK_SCORE', previousValue: prev.normalizedScore, currentValue: curr.normalizedScore, delta: curr.normalizedScore - prev.normalizedScore, description: `${riskType} increased from ${(prev.normalizedScore * 100).toFixed(0)} to ${(curr.normalizedScore * 100).toFixed(0)}` }],
        metadata: { riskType, previousScore: prev.normalizedScore, currentScore: curr.normalizedScore },
      }));
    } else if (prev && curr.normalizedScore < prev.normalizedScore - 0.05) {
      diffs.push(buildDiff({
        diffType: 'RISK_REDUCED', severity: 'MODERATE',
        previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
        impactedNodes: curr.impactedNodes,
        impactedRisks: [riskType],
        evidence: [{ metricType: 'RISK_SCORE', previousValue: prev.normalizedScore, currentValue: curr.normalizedScore, delta: curr.normalizedScore - prev.normalizedScore, description: `${riskType} decreased from ${(prev.normalizedScore * 100).toFixed(0)} to ${(curr.normalizedScore * 100).toFixed(0)}` }],
        metadata: { riskType, previousScore: prev.normalizedScore, currentScore: curr.normalizedScore },
      }));
    }
  }
  return diffs;
}

export function detectHotspotChanges(input: DiffInput): ArchitectureDiff[] {
  const diffs: ArchitectureDiff[] = [];
  const prevHotspots = new Set((input.previousHotspots ?? []).map(h => h.nodeId));
  const currHotspots = new Set((input.currentHotspots ?? []).map(h => h.nodeId));

  const emerged = [...currHotspots].filter(h => !prevHotspots.has(h));
  const resolved = [...prevHotspots].filter(h => !currHotspots.has(h));

  if (emerged.length > 0) {
    diffs.push(buildDiff({
      diffType: 'HOTSPOT_EMERGED', severity: 'HIGH',
      previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: emerged,
      evidence: [{ metricType: 'HOTSPOTS_EMERGED', previousValue: 0, currentValue: emerged.length, delta: emerged.length, description: `${emerged.length} new hotspot(s) detected` }],
      metadata: { emerged },
    }));
  }
  if (resolved.length > 0) {
    diffs.push(buildDiff({
      diffType: 'HOTSPOT_RESOLVED', severity: 'MODERATE',
      previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: resolved,
      evidence: [{ metricType: 'HOTSPOTS_RESOLVED', previousValue: resolved.length, currentValue: 0, delta: -resolved.length, description: `${resolved.length} hotspot(s) resolved` }],
      metadata: { resolved },
    }));
  }
  return diffs;
}

export function detectPropagationChanges(input: DiffInput): ArchitectureDiff[] {
  const diffs: ArchitectureDiff[] = [];
  const prevProp = new Map((input.previousPropagation ?? []).map(p => [p.nodeId, p.propagationPressure]));
  const currProp = new Map((input.currentPropagation ?? []).map(p => [p.nodeId, p.propagationPressure]));

  for (const [nodeId, currPressure] of currProp) {
    const prevPressure = prevProp.get(nodeId) ?? 0;
    if (currPressure > prevPressure + 0.1) {
      diffs.push(buildDiff({
        diffType: 'PROPAGATION_EXPANDED', severity: currPressure >= 0.7 ? 'CRITICAL' : 'HIGH',
        previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
        impactedNodes: [nodeId],
        evidence: [{ metricType: 'PROPAGATION_PRESSURE', previousValue: prevPressure, currentValue: currPressure, delta: currPressure - prevPressure, description: `Propagation pressure on ${nodeId} increased from ${prevPressure.toFixed(3)} to ${currPressure.toFixed(3)}` }],
        metadata: { nodeId, previousPressure: prevPressure, currentPressure: currPressure },
      }));
    }
  }
  return diffs;
}
