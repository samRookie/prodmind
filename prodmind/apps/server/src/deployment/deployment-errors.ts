export class DeploymentError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: Record<string, unknown>) {
    super(message);
    this.name = 'DeploymentError';
  }
}

export class DeploymentValidationError extends DeploymentError {
  constructor(failed: { name: string; message: string }[]) {
    super(`Deployment validation failed: ${failed.map(f => f.name).join(', ')}`, 'DEPLOYMENT_VALIDATION_ERROR', { failures: failed });
    this.name = 'DeploymentValidationError';
  }
}

export class ReleaseIntegrityError extends DeploymentError {
  constructor(failed: { name: string; expected: string; actual: string }[]) {
    super(`Release integrity check failed: ${failed.map(f => f.name).join(', ')}`, 'RELEASE_INTEGRITY_ERROR', { failures: failed });
    this.name = 'ReleaseIntegrityError';
  }
}

export class RuntimeCompatibilityError extends DeploymentError {
  constructor(failed: { name: string; requirement: string; actual: string }[]) {
    super(`Runtime compatibility check failed: ${failed.map(f => f.name).join(', ')}`, 'RUNTIME_COMPATIBILITY_ERROR', { failures: failed });
    this.name = 'RuntimeCompatibilityError';
  }
}
