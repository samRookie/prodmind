export class InsightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsightError';
  }
}

export class InsightValidationError extends InsightError {
  constructor(message: string) {
    super(message);
    this.name = 'InsightValidationError';
  }
}

export class InsightDeterminismError extends InsightError {
  constructor(message: string) {
    super(message);
    this.name = 'InsightDeterminismError';
  }
}

export class EvidenceError extends InsightError {
  constructor(message: string) {
    super(message);
    this.name = 'EvidenceError';
  }
}

export class RemediationError extends InsightError {
  constructor(message: string) {
    super(message);
    this.name = 'RemediationError';
  }
}

export class DriftError extends InsightError {
  constructor(message: string) {
    super(message);
    this.name = 'DriftError';
  }
}

export class ReplayError extends InsightError {
  constructor(message: string) {
    super(message);
    this.name = 'ReplayError';
  }
}
