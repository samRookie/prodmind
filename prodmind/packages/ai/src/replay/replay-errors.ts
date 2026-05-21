export class ReplayError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = 'ReplayError';
    this.code = code;
  }
}

export class IntegrityError extends ReplayError {
  public readonly expectedFingerprint: string;
  public readonly actualFingerprint: string;

  public constructor(expectedFingerprint: string, actualFingerprint: string) {
    super(
      'INTEGRITY_ERROR',
      `Execution snapshot fingerprint mismatch: expected ${expectedFingerprint}, got ${actualFingerprint}`,
    );
    this.expectedFingerprint = expectedFingerprint;
    this.actualFingerprint = actualFingerprint;
  }
}

export class DivergenceError extends ReplayError {
  public readonly divergences: string[];

  public constructor(divergences: string[]) {
    super('DIVERGENCE', `Replay diverged from original: ${divergences.join(', ')}`);
    this.divergences = divergences;
  }
}
