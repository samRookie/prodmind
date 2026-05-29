import type { SimulationResult } from '../types/index.ts';
import type { AuditEntry } from './forecast-audit.ts';

export function auditSimulation(simulation: SimulationResult): AuditEntry[] {
  const entries: AuditEntry[] = [];
  entries.push({
    timestamp: new Date().toISOString(),
    check: 'simulation_fingerprint',
    passed: simulation.fingerprint.length > 0,
    details: `Fingerprint: ${simulation.fingerprint}`,
  });
  entries.push({
    timestamp: new Date().toISOString(),
    check: 'simulation_steps',
    passed: simulation.steps.length > 0,
    details: `Step count: ${simulation.steps.length}`,
  });
  entries.push({
    timestamp: new Date().toISOString(),
    check: 'simulation_bounds',
    passed: simulation.bounds.confidenceThreshold > 0,
    details: `Confidence threshold: ${simulation.bounds.confidenceThreshold}`,
  });
  for (const step of simulation.steps) {
    entries.push({
      timestamp: new Date().toISOString(),
      check: `simulation_step_${step.stepIndex}_confidence`,
      passed: step.confidence >= 0 && step.confidence <= 1,
      details: `Confidence: ${step.confidence}`,
    });
  }
  return entries;
}
