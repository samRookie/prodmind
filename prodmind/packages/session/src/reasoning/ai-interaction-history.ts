import type { InteractionRole, InteractionType } from '../types/index.ts';
import { computeHash } from '../utils/index.ts';
import { InteractionRecord } from './interaction-record.ts';

export class AIInteractionHistory {
  public readonly sessionId: string;
  public readonly interactions: InteractionRecord[];
  private nextSeq: number;

  public constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.interactions = [];
    this.nextSeq = 1;
  }

  public recordInteraction(
    role: InteractionRole,
    type: InteractionType,
    content: string,
    modelId?: string,
    parentId?: string,
    metadata?: Record<string, unknown>,
  ): InteractionRecord {
    const record = InteractionRecord.create(
      this.sessionId,
      role,
      type,
      content,
      this.nextSeq++,
      { modelId, parentInteractionId: parentId, metadata },
    );

    this.interactions.push(record);
    return record;
  }

  public getInteractions(): InteractionRecord[] {
    return [...this.interactions];
  }

  public getByType(type: InteractionType): InteractionRecord[] {
    return this.interactions.filter((i) => i.interactionType === type);
  }

  public getByRole(role: InteractionRole): InteractionRecord[] {
    return this.interactions.filter((i) => i.role === role);
  }

  public getConversationThread(parentId: string): InteractionRecord[] {
    const thread: InteractionRecord[] = [];
    const map = new Map<string, InteractionRecord>();

    for (const interaction of this.interactions) {
      map.set(interaction.id, interaction);
    }

    const start = map.get(parentId);
    if (!start) return [];

    thread.push(start);
    let current = start;

    while (current) {
      const next = this.interactions.find(
        (i) => i.parentInteractionId === current.id,
      );
      if (!next) break;
      thread.push(next);
      current = next;
    }

    return thread;
  }

  public getLatestInteraction(): InteractionRecord | undefined {
    if (this.interactions.length === 0) return undefined;
    return this.interactions[this.interactions.length - 1];
  }

  public getInteractionCount(): number {
    return this.interactions.length;
  }

  public computeContentHash(content: string): string {
    return computeHash(content);
  }

  public toJSON(): { sessionId: string; interactions: InteractionRecord[]; nextSequenceNumber: number } {
    return {
      sessionId: this.sessionId,
      interactions: [...this.interactions],
      nextSequenceNumber: this.nextSeq,
    };
  }

  public static fromJSON(data: { sessionId: string; interactions: InteractionRecord[]; nextSequenceNumber: number }): AIInteractionHistory {
    const history = new AIInteractionHistory(data.sessionId);
    history.interactions.push(...data.interactions);
    history.nextSeq = data.nextSequenceNumber;
    return history;
  }
}
