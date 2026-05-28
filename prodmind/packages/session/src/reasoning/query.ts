import type { InteractionRole, InteractionType } from '../types/index.ts';
import type { InteractionRecord } from './interaction-record.ts';

export interface InteractionFilter {
  types?: InteractionType[];
  roles?: InteractionRole[];
  dateFrom?: string;
  dateTo?: string;
  keywords?: string[];
  modelId?: string;
}

export function queryInteractions(interactions: InteractionRecord[], filter: InteractionFilter): InteractionRecord[] {
  return interactions.filter((interaction) => {
    if (filter.types && filter.types.length > 0 && !filter.types.includes(interaction.interactionType)) {
      return false;
    }
    if (filter.roles && filter.roles.length > 0 && !filter.roles.includes(interaction.role)) {
      return false;
    }
    if (filter.dateFrom && interaction.createdAt < filter.dateFrom) {
      return false;
    }
    if (filter.dateTo && interaction.createdAt > filter.dateTo) {
      return false;
    }
    if (filter.keywords && filter.keywords.length > 0) {
      const searchText = `${interaction.content} ${interaction.interactionType} ${interaction.role}`.toLowerCase();
      const matchesKeyword = filter.keywords.some((kw) => searchText.includes(kw.toLowerCase()));
      if (!matchesKeyword) return false;
    }
    if (filter.modelId && interaction.modelId !== filter.modelId) {
      return false;
    }
    return true;
  });
}

export function searchInteractions(interactions: InteractionRecord[], query: string): InteractionRecord[] {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();
  return interactions.filter((interaction) => {
    const searchable = [
      interaction.content,
      interaction.interactionType,
      interaction.role,
      interaction.modelId ?? '',
      interaction.id,
    ].join(' ').toLowerCase();
    return searchable.includes(lowerQuery);
  });
}

export function findRelatedInteractions(interactionId: string, interactions: InteractionRecord[]): InteractionRecord[] {
  const target = interactions.find((i) => i.id === interactionId);
  if (!target) return [];

  const related: InteractionRecord[] = [target];
  const parentChain: InteractionRecord[] = [];
  const childChain: InteractionRecord[] = [];

  let current = target;
  while (current.parentInteractionId) {
    const parent = interactions.find((i) => i.id === current.parentInteractionId);
    if (!parent) break;
    parentChain.unshift(parent);
    current = parent;
  }

  current = target;
  let found = true;
  while (found) {
    found = false;
    const child = interactions.find(
      (i) => i.parentInteractionId === current.id && !childChain.includes(i),
    );
    if (child) {
      childChain.push(child);
      current = child;
      found = true;
    }
  }

  return [...parentChain, ...related, ...childChain];
}

export function getInteractionsByModel(interactions: InteractionRecord[], modelId: string): InteractionRecord[] {
  return interactions.filter((i) => i.modelId === modelId);
}
