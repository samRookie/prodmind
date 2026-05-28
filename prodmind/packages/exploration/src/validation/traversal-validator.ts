import type { TraversalResult, TraversalStep } from '../types/index.ts';

export class TraversalValidator {
  public validate(traversal: TraversalResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!traversal.id) errors.push('Missing traversal id');
    if (!traversal.strategy) errors.push('Missing traversal strategy');
    if (!traversal.startNode) errors.push('Missing start node');
    if (traversal.nodeCount < 0) errors.push('Invalid node count');
    if (traversal.depth < 0) errors.push('Invalid depth');
    if (traversal.duration < 0) errors.push('Invalid duration');
    if (!traversal.status) errors.push('Missing status');
    if (traversal.steps.length === 0) errors.push('Traversal has no steps');
    const stepsValidation = this.validateSteps(traversal.steps);
    errors.push(...stepsValidation.errors);
    const orderingValidation = this.validateOrdering(traversal.steps);
    errors.push(...orderingValidation.errors);
    const dupeCheck = this.validateNoDuplicates(traversal.steps);
    errors.push(...dupeCheck.errors);
    const depthCheck = this.validateDepthConsistency(traversal.steps);
    errors.push(...depthCheck.errors);
    return { valid: errors.length === 0, errors };
  }

  public validateSteps(steps: TraversalStep[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      if (!step.nodeId) errors.push(`Step ${i}: missing nodeId`);
      if (step.depth < 0) errors.push(`Step ${i}: invalid depth ${step.depth}`);
      if (step.nodeId && typeof step.nodeId !== 'string') {
        errors.push(`Step ${i}: nodeId must be a string`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  public validateOrdering(steps: TraversalStep[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1]!;
      const curr = steps[i]!;
      const depthDiff = Math.abs(curr.depth - prev.depth);
      if (depthDiff > 1) {
        errors.push(
          `Step ${i}: depth jump from ${prev.depth} to ${curr.depth} exceeds 1`,
        );
      }
    }
    return { valid: errors.length === 0, errors };
  }

  public validateNoDuplicates(steps: TraversalStep[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < steps.length; i++) {
      if (seen.has(steps[i]!.nodeId)) {
        errors.push(`Step ${i}: duplicate nodeId ${steps[i]!.nodeId}`);
      }
      seen.add(steps[i]!.nodeId);
    }
    return { valid: errors.length === 0, errors };
  }

  public validateDepthConsistency(steps: TraversalStep[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (steps.length === 0) return { valid: true, errors: [] };
    if (steps[0]!.depth !== 0) {
      errors.push(`First step must have depth 0, got ${steps[0]!.depth}`);
    }
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1]!;
      const curr = steps[i]!;
      if (curr.depth < 0) {
        errors.push(`Step ${i}: negative depth ${curr.depth}`);
        continue;
      }
      if (curr.depth > prev.depth + 1) {
        errors.push(
          `Step ${i}: depth ${curr.depth} exceeds parent depth ${prev.depth} + 1`,
        );
      }
    }
    return { valid: errors.length === 0, errors };
  }
}
