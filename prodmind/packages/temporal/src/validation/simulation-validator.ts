import type { SimulationResult } from '../types/index.ts';

export interface SimulationValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSimulation(simulation: SimulationResult): SimulationValidationResult {
  const errors: string[] = [];
  if (!simulation.id) errors.push('Missing simulation id');
  if (!simulation.projectId) errors.push('Missing projectId');
  if (!simulation.scenarioName) errors.push('Missing scenarioName');
  if (!simulation.fingerprint) errors.push('Missing fingerprint');
  if (simulation.steps.length === 0) errors.push('No simulation steps');
  if (!simulation.bounds) errors.push('Missing bounds');
  for (const step of simulation.steps) {
    if (step.stepIndex < 0) errors.push(`Negative stepIndex: ${step.stepIndex}`);
    if (step.confidence < 0 || step.confidence > 1) errors.push(`Step ${step.stepIndex} confidence out of range`);
    for (const [key, val] of Object.entries(step.predictedValues)) {
      if (!isFinite(val)) errors.push(`Non-finite predictedValue for ${key} at step ${step.stepIndex}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
