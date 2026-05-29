import type { ForecastWindow, SimulationResult } from '../types/index.ts';
import { generateId, now } from '../utils/index.ts';
import { generateSimulationSteps } from './bounded-simulation.ts';

export interface SimulationInput {
  scenarioName: string;
  metrics: Record<string, Array<{ timestamp: string; value: number }>>;
  window: ForecastWindow;
  stepCount: number;
}

export class SimulationEngine {
  simulate(input: SimulationInput): SimulationResult {
    const steps = Object.entries(input.metrics).flatMap(([name, values]) =>
      generateSimulationSteps(name, values, input.window, input.stepCount),
    );
    const fingerprint = `${input.scenarioName}-${input.window.startTimestamp}-${input.window.endTimestamp}`;
    return {
      id: generateId(),
      projectId: '',
      createdAt: now(),
      scenarioName: input.scenarioName,
      steps,
      bounds: input.window,
      fingerprint,
    };
  }
}
