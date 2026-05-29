import type { ForecastResult, SimulationResult,TemporalSnapshot, TrajectoryResult } from '../types/index.ts';

export interface ReplayComparison {
  snapshotsMatch: boolean;
  forecastMatch: boolean;
  trajectoryMatch: boolean;
  simulationMatch: boolean;
  allMatch: boolean;
}

export function compareReplayResults(
  originalSnapshots: TemporalSnapshot[],
  replayedSnapshots: TemporalSnapshot[],
  originalForecast: ForecastResult,
  replayedForecast: ForecastResult,
  originalTrajectory: TrajectoryResult,
  replayedTrajectory: TrajectoryResult,
  originalSimulation: SimulationResult,
  replayedSimulation: SimulationResult,
): ReplayComparison {
  const snapshotsMatch = originalSnapshots.length === replayedSnapshots.length
    && originalSnapshots.every((s, i) => s.id === replayedSnapshots[i]!.id && s.fingerprint === replayedSnapshots[i]!.fingerprint);
  const forecastMatch = originalForecast.fingerprint === replayedForecast.fingerprint
    && originalForecast.predictions.length === replayedForecast.predictions.length;
  const trajectoryMatch = originalTrajectory.metricTrajectories.length === replayedTrajectory.metricTrajectories.length
    && originalTrajectory.degradationVelocity === replayedTrajectory.degradationVelocity;
  const simulationMatch = originalSimulation.fingerprint === replayedSimulation.fingerprint
    && originalSimulation.steps.length === replayedSimulation.steps.length;
  return {
    snapshotsMatch,
    forecastMatch,
    trajectoryMatch,
    simulationMatch,
    allMatch: snapshotsMatch && forecastMatch && trajectoryMatch && simulationMatch,
  };
}
