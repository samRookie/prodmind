export class SessionError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  public constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SessionError';
    this.code = code;
    this.details = details;
  }
}

export class SessionNotFoundError extends SessionError {
  public constructor(sessionId: string) {
    super('SESSION_NOT_FOUND', `Analysis session not found: ${sessionId}`, { sessionId });
    this.name = 'SessionNotFoundError';
  }
}

export class SessionStateError extends SessionError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('SESSION_STATE_ERROR', message, details);
    this.name = 'SessionStateError';
  }
}

export class SessionValidationError extends SessionError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('SESSION_VALIDATION_ERROR', message, details);
    this.name = 'SessionValidationError';
  }
}

export class TimelineError extends SessionError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('TIMELINE_ERROR', message, details);
    this.name = 'TimelineError';
  }
}

export class SnapshotError extends SessionError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('SNAPSHOT_ERROR', message, details);
    this.name = 'SnapshotError';
  }
}

export class PersistenceError extends SessionError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('PERSISTENCE_ERROR', message, details);
    this.name = 'PersistenceError';
  }
}

export class ReplayError extends SessionError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('REPLAY_ERROR', message, details);
    this.name = 'ReplayError';
  }
}

export class RestorationError extends SessionError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('RESTORATION_ERROR', message, details);
    this.name = 'RestorationError';
  }
}

export class LifecycleError extends SessionError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('LIFECYCLE_ERROR', message, details);
    this.name = 'LifecycleError';
  }
}

export class SerializationError extends SessionError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('SERIALIZATION_ERROR', message, details);
    this.name = 'SerializationError';
  }
}

export class AuditError extends SessionError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super('AUDIT_ERROR', message, details);
    this.name = 'AuditError';
  }
}
