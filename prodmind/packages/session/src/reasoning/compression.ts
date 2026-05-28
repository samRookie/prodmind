import type { InteractionRecord } from './interaction-record.ts';

export interface InteractionSummaryStats {
  totalInteractions: number;
  byRole: Record<string, number>;
  byType: Record<string, number>;
  byModel: Record<string, number>;
  totalTokensUsed: number;
}

function isFillerInteraction(interaction: InteractionRecord): boolean {
  const fillerPatterns = [
    'ok',
    'okay',
    'got it',
    'understood',
    'i see',
    'thanks',
    'thank you',
    'proceed',
    'continue',
    'go on',
    'yes',
    'no',
    'correct',
    'right',
    'sure',
    'alright',
    'fine',
  ];

  const lower = interaction.content.toLowerCase().trim();
  return fillerPatterns.some((p) => lower === p || lower.startsWith(p));
}

function isRedundant(next: InteractionRecord, current: InteractionRecord): boolean {
  if (next.role === current.role) return false;
  if (next.interactionType !== current.interactionType) return false;
  return next.contentHash === current.contentHash;
}

export function compressInteractions(interactions: InteractionRecord[]): InteractionRecord[] {
  const sorted = [...interactions].sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  const compressed: InteractionRecord[] = [];

  for (const interaction of sorted) {
    if (isFillerInteraction(interaction)) continue;

    const last = compressed[compressed.length - 1];
    if (last && isRedundant(interaction, last)) continue;

    compressed.push(interaction);
  }

  return compressed;
}

export function decompressInteractions(compressed: InteractionRecord[]): InteractionRecord[] {
  return [...compressed].map((i) => i);
}

export function summarizeInteractions(interactions: InteractionRecord[]): string {
  const stats = extractKeyDecisions(interactions);

  const summaryStats = getInteractionStats(interactions);
  const parts: string[] = [
    `Total: ${summaryStats.totalInteractions}`,
  ];

  for (const [role, count] of Object.entries(summaryStats.byRole)) {
    parts.push(`${role}: ${count}`);
  }

  if (stats.length > 0) {
    parts.push(`Key decisions: ${stats.length}`);
  }

  return parts.join(' | ');
}

export function extractKeyDecisions(interactions: InteractionRecord[]): InteractionRecord[] {
  return interactions.filter(
    (i) =>
      i.interactionType === 'DECISION' &&
      !isFillerInteraction(i),
  );
}

function getInteractionStats(interactions: InteractionRecord[]): InteractionSummaryStats {
  const byRole: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  let totalTokensUsed = 0;

  for (const interaction of interactions) {
    byRole[interaction.role] = (byRole[interaction.role] ?? 0) + 1;
    byType[interaction.interactionType] = (byType[interaction.interactionType] ?? 0) + 1;

    if (interaction.modelId) {
      byModel[interaction.modelId] = (byModel[interaction.modelId] ?? 0) + 1;
    }

    if (interaction.tokensUsed !== undefined) {
      totalTokensUsed += interaction.tokensUsed;
    }
  }

  return {
    totalInteractions: interactions.length,
    byRole,
    byType,
    byModel,
    totalTokensUsed,
  };
}
