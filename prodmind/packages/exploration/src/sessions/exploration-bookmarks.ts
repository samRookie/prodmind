import type { NodeId, SessionId } from '../types/index.ts';
import { nowISO } from '../utils/index.ts';

export class ExplorationBookmarks {
  private bookmarks: Map<SessionId, Array<{ nodeId: NodeId; label: string; timestamp: string; notes?: string }>>;

  constructor() {
    this.bookmarks = new Map();
  }

  public addBookmark(sessionId: SessionId, nodeId: NodeId, label: string, notes?: string): void {
    if (!this.bookmarks.has(sessionId)) {
      this.bookmarks.set(sessionId, []);
    }
    const sessionBookmarks = this.bookmarks.get(sessionId)!;
    const existing = sessionBookmarks.findIndex((b) => b.nodeId === nodeId);
    if (existing >= 0) {
      sessionBookmarks[existing] = { nodeId, label, timestamp: nowISO(), notes };
    } else {
      sessionBookmarks.push({ nodeId, label, timestamp: nowISO(), notes });
    }
  }

  public removeBookmark(sessionId: SessionId, nodeId: NodeId): void {
    const sessionBookmarks = this.bookmarks.get(sessionId);
    if (!sessionBookmarks) return;
    this.bookmarks.set(
      sessionId,
      sessionBookmarks.filter((b) => b.nodeId !== nodeId),
    );
  }

  public getBookmarks(sessionId: SessionId): Array<{ nodeId: NodeId; label: string; timestamp: string; notes?: string }> {
    return [...(this.bookmarks.get(sessionId) ?? [])];
  }

  public getAllBookmarks(): Map<SessionId, Array<{ nodeId: NodeId; label: string; timestamp: string; notes?: string }>> {
    const result = new Map<SessionId, Array<{ nodeId: NodeId; label: string; timestamp: string; notes?: string }>>();
    for (const [key, value] of this.bookmarks) {
      result.set(key, [...value]);
    }
    return result;
  }

  public clearSession(sessionId: SessionId): void {
    this.bookmarks.delete(sessionId);
  }
}
