import type { InteractionRecord } from './interaction-record.ts';

export interface ReasoningStep {
  interactionId: string;
  role: string;
  type: string;
  contentPreview: string;
  sequenceNumber: number;
}

export class ReasoningChain {
  public buildChain(interactions: InteractionRecord[]): InteractionRecord[][] {
    const chains: InteractionRecord[][] = [];
    const visited = new Set<string>();

    const rootInteractions = interactions.filter((i) => !i.parentInteractionId);

    for (const root of rootInteractions) {
      if (visited.has(root.id)) continue;
      const chain = this.getChainForInteraction(root.id, interactions);
      for (const link of chain) {
        visited.add(link.id);
      }
      chains.push(chain);
    }

    const orphaned = interactions.filter((i) => !visited.has(i.id));
    if (orphaned.length > 0) {
      chains.push(orphaned.sort((a, b) => a.sequenceNumber - b.sequenceNumber));
    }

    return chains;
  }

  public getChainForInteraction(interactionId: string, interactions: InteractionRecord[]): InteractionRecord[] {
    const chain: InteractionRecord[] = [];
    const map = new Map<string, InteractionRecord>();

    for (const interaction of interactions) {
      map.set(interaction.id, interaction);
    }

    const start = map.get(interactionId);
    if (!start) return [];

    chain.push(start);
    let current = start;

    while (current) {
      const next = interactions.find(
        (i) => i.parentInteractionId === current.id,
      );
      if (!next) break;
      chain.push(next);
      current = next;
    }

    return chain;
  }

  public getReasoningPath(interactions: InteractionRecord[]): ReasoningStep[] {
    const sorted = [...interactions].sort(
      (a, b) => a.sequenceNumber - b.sequenceNumber,
    );

    return sorted.map((i) => ({
      interactionId: i.id,
      role: i.role,
      type: i.interactionType,
      contentPreview: i.content.length > 100 ? `${i.content.slice(0, 100)}...` : i.content,
      sequenceNumber: i.sequenceNumber,
    }));
  }

  public summarizeChain(chain: InteractionRecord[]): string {
    if (chain.length === 0) return 'Empty chain';

    const steps = this.getReasoningPath(chain);
    const userSteps = steps.filter((s) => s.role === 'USER').length;
    const aiSteps = steps.filter((s) => s.role === 'AI').length;
    const systemSteps = steps.filter((s) => s.role === 'SYSTEM').length;

    const firstStep = steps[0];
    const lastStep = steps[steps.length - 1];
    const fromTo = firstStep && lastStep
      ? `From: ${firstStep.type} -> ${lastStep.type}`
      : 'Empty path';

    const parts: string[] = [
      `Chain length: ${chain.length}`,
      `User: ${userSteps}, AI: ${aiSteps}, System: ${systemSteps}`,
      fromTo,
    ];

    return parts.join(' | ');
  }

  public chainLength(chain: InteractionRecord[]): number {
    return chain.length;
  }
}
