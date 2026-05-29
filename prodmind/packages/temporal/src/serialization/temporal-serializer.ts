import type { EvolutionPoint, ForecastResult, SimulationResult,TemporalSnapshot, TrajectoryResult } from '../types/index.ts';

export function serializeSnapshot(snapshot: TemporalSnapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializeSnapshot(json: string): TemporalSnapshot {
  return JSON.parse(json) as TemporalSnapshot;
}

export function serializeForecast(forecast: ForecastResult): string {
  return JSON.stringify(forecast);
}

export function deserializeForecast(json: string): ForecastResult {
  return JSON.parse(json) as ForecastResult;
}

export function serializeTrajectory(trajectory: TrajectoryResult): string {
  return JSON.stringify(trajectory);
}

export function deserializeTrajectory(json: string): TrajectoryResult {
  return JSON.parse(json) as TrajectoryResult;
}

export function serializeSimulation(simulation: SimulationResult): string {
  return JSON.stringify(simulation);
}

export function deserializeSimulation(json: string): SimulationResult {
  return JSON.parse(json) as SimulationResult;
}

export function serializeEvolutionPoint(point: EvolutionPoint): string {
  return JSON.stringify(point);
}

export function deserializeEvolutionPoint(json: string): EvolutionPoint {
  return JSON.parse(json) as EvolutionPoint;
}
