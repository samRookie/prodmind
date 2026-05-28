import { nowISO } from '../utils/index.ts';
import { GraphReference } from './graph-reference.ts';
import type { GraphReferenceData } from './graph-reference.ts';

export interface GraphStateLink {
  sessionId: string;
  graphSnapshotId: string;
  createdAt: string;
  references: GraphReference[];
}

export class GraphStateLinker {
  private links: Map<string, GraphStateLink> = new Map();

  public linkSessionToGraphState(sessionId: string, graphSnapshotId: string): GraphStateLink {
    const key = this.linkKey(sessionId, graphSnapshotId);
    const existing = this.links.get(key);
    if (existing) {
      return existing;
    }

    const link: GraphStateLink = {
      sessionId,
      graphSnapshotId,
      createdAt: nowISO(),
      references: [],
    };

    this.links.set(key, link);
    return link;
  }

  public getLinkedGraphStates(sessionId: string): GraphStateLink[] {
    return Array.from(this.links.values()).filter((l) => l.sessionId === sessionId);
  }

  public getSessionsForGraphState(graphSnapshotId: string): GraphStateLink[] {
    return Array.from(this.links.values()).filter((l) => l.graphSnapshotId === graphSnapshotId);
  }

  public unlinkSessionFromGraph(sessionId: string, graphSnapshotId: string): void {
    const key = this.linkKey(sessionId, graphSnapshotId);
    this.links.delete(key);
  }

  public getGraphReferencesForSession(sessionId: string): GraphReference[] {
    const sessionLinks = this.getLinkedGraphStates(sessionId);
    return sessionLinks.flatMap((l) => l.references);
  }

  public addReferenceToLink(sessionId: string, graphSnapshotId: string, data: GraphReferenceData): GraphReference {
    const key = this.linkKey(sessionId, graphSnapshotId);
    let link = this.links.get(key);
    if (!link) {
      link = this.linkSessionToGraphState(sessionId, graphSnapshotId);
    }

    const ref = new GraphReference(data);
    link.references.push(ref);
    this.links.set(key, link);
    return ref;
  }

  private linkKey(sessionId: string, graphSnapshotId: string): string {
    return `${sessionId}::${graphSnapshotId}`;
  }
}
