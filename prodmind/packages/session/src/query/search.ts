import type { SessionSummary } from '../types/index.ts';
import { SessionError } from '../errors/index.ts';
import type { TimelineEvent } from '../timeline/investigation-timeline.ts';
import type { ReasoningSnapshotData } from '../snapshots/reasoning-snapshot.ts';

export interface SearchResult {
  type: 'session' | 'timeline_event' | 'interaction' | 'snapshot';
  id: string;
  sessionId: string;
  relevance: number;
  matchField: string;
  matchSnippet: string;
  timestamp: string;
}

export interface RankedSearchResult extends SearchResult {
  score: number;
}

export class SessionSearchEngine {
  private readonly sessions: SessionSummary[];
  private readonly events: TimelineEvent[];
  private readonly interactions: Record<string, unknown>[];
  private readonly snapshots: ReasoningSnapshotData[];

  public constructor(
    sessions: SessionSummary[] = [],
    events: TimelineEvent[] = [],
    interactions: Record<string, unknown>[] = [],
    snapshots: ReasoningSnapshotData[] = [],
  ) {
    this.sessions = sessions;
    this.events = events;
    this.interactions = interactions;
    this.snapshots = snapshots;
  }

  public searchAll(query: string): RankedSearchResult[] {
    if (!query) {
      throw new SessionError('SEARCH_ERROR', 'Search query is required', { query });
    }

    const results: SearchResult[] = [
      ...this.searchSessions(query),
      ...this.searchTimelineEvents(query),
      ...this.searchInteractions(query),
      ...this.searchSnapshots(query),
    ];

    return this.rankResults(results, query);
  }

  public searchSessions(query: string): SearchResult[] {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const session of this.sessions) {
      const searchable: Record<string, string> = {
        id: session.id,
        projectId: session.projectId,
        investigationGoal: session.investigationGoal ?? '',
        status: session.status,
        priority: session.priority,
        tags: (session.tags ?? []).join(' '),
      };

      for (const [field, value] of Object.entries(searchable)) {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes(lowerQuery)) {
          const startIndex = Math.max(0, lowerValue.indexOf(lowerQuery));
          const snippet = value.slice(startIndex, startIndex + 80);
          results.push({
            type: 'session',
            id: session.id,
            sessionId: session.id,
            relevance: lowerQuery.length / value.length,
            matchField: field,
            matchSnippet: snippet,
            timestamp: session.createdAt,
          });
          break;
        }
      }
    }

    return results;
  }

  public searchTimelineEvents(query: string): SearchResult[] {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const event of this.events) {
      const payloadText = event.payloadJson ?? '';
      const metadataText = event.metadataJson ?? '';
      const searchText = `${event.eventType} ${payloadText} ${metadataText}`.toLowerCase();

      if (searchText.includes(lowerQuery)) {
        const startIndex = Math.max(0, searchText.indexOf(lowerQuery));
        const snippet = searchText.slice(startIndex, startIndex + 80);
        results.push({
          type: 'timeline_event',
          id: event.id,
          sessionId: event.sessionId,
          relevance: lowerQuery.length / searchText.length,
          matchField: 'payload',
          matchSnippet: snippet,
          timestamp: event.timestamp,
        });
      }
    }

    return results;
  }

  public searchInteractions(query: string): SearchResult[] {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const interaction of this.interactions) {
      const searchText = Object.values(interaction)
        .filter((v): v is string => typeof v === 'string')
        .join(' ')
        .toLowerCase();

      if (searchText.includes(lowerQuery)) {
        const startIndex = Math.max(0, searchText.indexOf(lowerQuery));
        const snippet = searchText.slice(startIndex, startIndex + 80);
        results.push({
          type: 'interaction',
          id: String(interaction.id ?? ''),
          sessionId: String(interaction.sessionId ?? ''),
          relevance: lowerQuery.length / searchText.length,
          matchField: 'content',
          matchSnippet: snippet,
          timestamp: String(interaction.createdAt ?? ''),
        });
      }
    }

    return results;
  }

  public searchSnapshots(query: string): SearchResult[] {
    if (!query) return [];
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const snapshot of this.snapshots) {
      const searchable: Record<string, string> = {
        id: snapshot.id ?? '',
        sessionId: snapshot.sessionId,
        stateHash: snapshot.stateHash ?? '',
        fingerprintHash: snapshot.fingerprintHash ?? '',
        snapshotType: snapshot.snapshotType ?? '',
      };

      for (const [field, value] of Object.entries(searchable)) {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes(lowerQuery)) {
          const startIndex = Math.max(0, lowerValue.indexOf(lowerQuery));
          const snippet = value.slice(startIndex, startIndex + 80);
          results.push({
            type: 'snapshot',
            id: snapshot.id ?? '',
            sessionId: snapshot.sessionId,
            relevance: lowerQuery.length / value.length,
            matchField: field,
            matchSnippet: snippet,
            timestamp: snapshot.createdAt ?? '',
          });
          break;
        }
      }
    }

    return results;
  }

  public rankResults(results: SearchResult[], query: string): RankedSearchResult[] {
    if (results.length === 0) return [];
    const lowerQuery = query.toLowerCase();

    const ranked: RankedSearchResult[] = results.map((r) => {
      let score = r.relevance;

      const typeWeights: Record<string, number> = {
        session: 1.0,
        timeline_event: 0.9,
        interaction: 0.85,
        snapshot: 0.8,
      };
      score *= typeWeights[r.type] ?? 0.8;

      if (r.matchField === 'id' || r.matchField === 'sessionId') {
        score *= 1.3;
      } else if (r.matchField === 'investigationGoal' || r.matchField === 'content') {
        score *= 1.1;
      }

      if (r.matchSnippet.toLowerCase() === lowerQuery) {
        score *= 2.0;
      } else if (r.matchSnippet.toLowerCase().startsWith(lowerQuery)) {
        score *= 1.5;
      }

      return { ...r, score };
    });

    return ranked.sort((a, b) => b.score - a.score);
  }
}
