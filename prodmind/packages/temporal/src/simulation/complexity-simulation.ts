import type { ForecastWindow, SimulationStep } from '../types/index.ts';
import { linearProjection } from '../utils/index.ts';

export function simulateComplexity(
  historicalValues: Array<{ timestamp: string; value: number }>,
  window: ForecastWindow,
  stepCount: number,
): SimulationStep[] {
  const steps: SimulationStep[] = [];
  const startTime = new Date(window.startTimestamp).getTime();
  const endTime = new Date(window.endTimestamp).getTime();
  const stepInterval = (endTime - startTime) / stepCount;
  for (let i = 0; i < stepCount; i++) {
    const stepTime = new Date(startTime + stepInterval * (i + 1));
    const projection = linearProjection(historicalValues, stepTime.toISOString());
    steps.push({
      stepIndex: i,
      simulatedTimestamp: stepTime.toISOString(),
      predictedValues: { complexity: projection.value },
      confidence: projection.confidence,
    });
  }
  return steps;
}
