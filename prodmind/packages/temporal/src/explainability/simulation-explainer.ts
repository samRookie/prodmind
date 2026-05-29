import type { SimulationResult } from '../types/index.ts';

export interface SimulationExplanation {
  summary: string;
  scenarioDescription: string;
  stepCount: number;
  endState: Record<string, number>;
  confidenceTrend: string;
}

export function explainSimulation(simulation: SimulationResult): SimulationExplanation {
  const lastStep = simulation.steps[simulation.steps.length - 1];
  const startConfidence = simulation.steps[0]?.confidence ?? 0;
  const endConfidence = lastStep?.confidence ?? 0;
  return {
    summary: `Simulation "${simulation.scenarioName}" completed ${simulation.steps.length} steps`,
    scenarioDescription: simulation.scenarioName,
    stepCount: simulation.steps.length,
    endState: lastStep?.predictedValues ?? {},
    confidenceTrend: endConfidence >= startConfidence ? 'improving' : 'declining',
  };
}
