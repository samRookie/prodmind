import type { SimulationResult,TemporalEvidence } from '../types/index.ts';
import { createTemporalEvidence } from './temporal-evidence.ts';

export function buildSimulationEvidence(
  simulation: SimulationResult,
  confidence: number,
): TemporalEvidence {
  const lastStep = simulation.steps[simulation.steps.length - 1];
  return createTemporalEvidence(
    'simulation',
    `Simulation "${simulation.scenarioName}" with ${simulation.steps.length} steps`,
    [],
    lastStep?.predictedValues ?? {},
    simulation.steps.length > 1
      ? (simulation.steps[simulation.steps.length - 1]!.confidence - simulation.steps[0]!.confidence) /
        simulation.steps.length
      : 0,
    confidence,
  );
}
