import type { InteractionRole, InteractionType } from '../types/index.ts';
import { SessionValidationError } from '../errors/index.ts';
import { computeHash } from '../utils/index.ts';

export interface InteractionRecordData {
  id: string;
  sessionId: string;
  interactionType: InteractionType;
  role: InteractionRole;
  content: string;
  contentHash?: string;
  tokensUsed?: number;
  modelId?: string;
  sequenceNumber: number;
  parentInteractionId?: string;
  metadataJson?: string;
  createdAt: string;
}

export class InteractionRecord {
  public readonly id: string;
  public readonly sessionId: string;
  public readonly interactionType: InteractionType;
  public readonly role: InteractionRole;
  public readonly content: string;
  public readonly contentHash: string;
  public readonly tokensUsed?: number;
  public readonly modelId?: string;
  public readonly sequenceNumber: number;
  public readonly parentInteractionId?: string;
  public readonly metadataJson?: string;
  public readonly createdAt: string;

  public constructor(data: InteractionRecordData) {
    this.id = data.id;
    this.sessionId = data.sessionId;
    this.interactionType = data.interactionType;
    this.role = data.role;
    this.content = data.content;
    this.contentHash = data.contentHash ?? computeHash(data.content);
    this.tokensUsed = data.tokensUsed;
    this.modelId = data.modelId;
    this.sequenceNumber = data.sequenceNumber;
    this.parentInteractionId = data.parentInteractionId;
    this.metadataJson = data.metadataJson;
    this.createdAt = data.createdAt;
  }

  public static create(
    sessionId: string,
    role: InteractionRole,
    interactionType: InteractionType,
    content: string,
    sequenceNumber: number,
    options?: {
      modelId?: string;
      parentInteractionId?: string;
      tokensUsed?: number;
      metadata?: Record<string, unknown>;
    },
  ): InteractionRecord {
    const data: InteractionRecordData = {
      id: `int_${computeHash(`${sessionId}:${sequenceNumber}:${Date.now()}`).slice(0, 16)}`,
      sessionId,
      interactionType,
      role,
      content,
      sequenceNumber,
      createdAt: new Date().toISOString(),
    };

    if (options?.modelId) data.modelId = options.modelId;
    if (options?.parentInteractionId) data.parentInteractionId = options.parentInteractionId;
    if (options?.tokensUsed !== undefined) data.tokensUsed = options.tokensUsed;
    if (options?.metadata) data.metadataJson = JSON.stringify(options.metadata);

    return new InteractionRecord(data);
  }

  public validate(): void {
    if (!this.id) {
      throw new SessionValidationError('Interaction ID is required');
    }
    if (!this.sessionId) {
      throw new SessionValidationError('Session ID is required');
    }
    if (!this.interactionType) {
      throw new SessionValidationError('Interaction type is required');
    }
    if (!this.role) {
      throw new SessionValidationError('Interaction role is required');
    }
    if (!this.content) {
      throw new SessionValidationError('Interaction content is required');
    }
    if (this.content.length === 0) {
      throw new SessionValidationError('Interaction content cannot be empty');
    }
  }

  public toJSON(): InteractionRecordData {
    return {
      id: this.id,
      sessionId: this.sessionId,
      interactionType: this.interactionType,
      role: this.role,
      content: this.content,
      contentHash: this.contentHash,
      tokensUsed: this.tokensUsed,
      modelId: this.modelId,
      sequenceNumber: this.sequenceNumber,
      parentInteractionId: this.parentInteractionId,
      metadataJson: this.metadataJson,
      createdAt: this.createdAt,
    };
  }

  public static fromJSON(data: InteractionRecordData): InteractionRecord {
    return new InteractionRecord(data);
  }
}
