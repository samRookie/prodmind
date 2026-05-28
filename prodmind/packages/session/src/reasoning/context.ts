import type { InteractionRecord } from './interaction-record.ts';

export interface ReasoningContextData {
  sessionId: string;
  interactions: InteractionRecord[];
  snapshotCount: number;
  timelineEventCount: number;
  keyFindings: string[];
  contextWindow: InteractionRecord[];
  compressed: boolean;
}

export class ReasoningContext {
  public buildContext(
    sessionId: string,
    interactions: InteractionRecord[],
    snapshots: unknown[],
    timelineEvents: unknown[],
  ): ReasoningContextData {
    const keyFindings = this.extractKeyFindings(interactions);

    return {
      sessionId,
      interactions: [...interactions],
      snapshotCount: snapshots.length,
      timelineEventCount: timelineEvents.length,
      keyFindings,
      contextWindow: this.getContextWindow(interactions, 10),
      compressed: false,
    };
  }

  public extractKeyFindings(interactions: InteractionRecord[]): string[] {
    const findings: string[] = [];

    const decisionInteractions = interactions.filter(
      (i) => i.interactionType === 'DECISION',
    );

    for (const interaction of decisionInteractions) {
      const lines = interaction.content.split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines.slice(0, 3)) {
        const trimmed = line.trim();
        if (trimmed.length > 20) {
          findings.push(trimmed.length > 200 ? `${trimmed.slice(0, 200)}...` : trimmed);
        }
      }
    }

    const hypothesisInteractions = interactions.filter(
      (i) => i.interactionType === 'HYPOTHESIS',
    );

    for (const interaction of hypothesisInteractions) {
      const lines = interaction.content.split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines.slice(0, 2)) {
        const trimmed = line.trim();
        if (trimmed.length > 20 && !findings.includes(trimmed)) {
          findings.push(trimmed.length > 200 ? `${trimmed.slice(0, 200)}...` : trimmed);
        }
      }
    }

    return findings;
  }

  public getContextWindow(interactions: InteractionRecord[], windowSize: number): InteractionRecord[] {
    if (interactions.length <= windowSize) {
      return [...interactions];
    }
    return interactions.slice(interactions.length - windowSize);
  }

  public compressContext(context: ReasoningContextData): ReasoningContextData {
    const compressedInteractions = this.getContextWindow(context.interactions, 5);

    return {
      ...context,
      interactions: compressedInteractions,
      contextWindow: compressedInteractions,
      compressed: true,
    };
  }

  public expandContext(context: ReasoningContextData, interactions: InteractionRecord[]): ReasoningContextData {
    const existingIds = new Set(context.interactions.map((i) => i.id));
    const missing = interactions.filter((i) => !existingIds.has(i.id));

    return {
      ...context,
      interactions: [...missing, ...context.interactions].sort(
        (a, b) => a.sequenceNumber - b.sequenceNumber,
      ),
      contextWindow: this.getContextWindow(
        [...missing, ...context.interactions],
        10,
      ),
      compressed: false,
    };
  }
}
