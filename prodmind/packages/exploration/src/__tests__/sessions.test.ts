import { describe, it, expect } from 'vitest';
import { ExplorationSessionManager } from '../sessions/exploration-session.ts';
import { ExplorationState } from '../sessions/exploration-state.ts';
import { ExplorationHistory } from '../sessions/exploration-history.ts';
import { ExplorationBookmarks } from '../sessions/exploration-bookmarks.ts';
import { ExplorationCheckpoints } from '../sessions/exploration-checkpoints.ts';
import { ExplorationReplay } from '../sessions/exploration-replay.ts';

describe('ExplorationSessionManager', () => {
  it('createSession creates a session', () => {
    const manager = new ExplorationSessionManager();
    const session = manager.createSession('FIND nodes', 'BFS', 'A');
    expect(session.query).toBe('FIND nodes');
    expect(session.strategy).toBe('BFS');
    expect(session.status).toBe('ACTIVE');
  });

  it('getSession returns session by ID', () => {
    const manager = new ExplorationSessionManager();
    const session = manager.createSession('FIND nodes', 'BFS');
    const retrieved = manager.getSession(session.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(session.id);
  });

  it('getSession returns undefined for unknown', () => {
    const manager = new ExplorationSessionManager();
    expect(manager.getSession('unknown')).toBeUndefined();
  });

  it('updateStatus changes session status', () => {
    const manager = new ExplorationSessionManager();
    const session = manager.createSession('FIND nodes', 'BFS');
    manager.updateStatus(session.id, 'PAUSED');
    expect(manager.getSession(session.id)!.status).toBe('PAUSED');
  });

  it('pauseSession sets PAUSED', () => {
    const manager = new ExplorationSessionManager();
    const session = manager.createSession('FIND nodes', 'BFS');
    manager.pauseSession(session.id);
    expect(manager.getSession(session.id)!.status).toBe('PAUSED');
  });

  it('resumeSession sets ACTIVE', () => {
    const manager = new ExplorationSessionManager();
    const session = manager.createSession('FIND nodes', 'BFS');
    manager.pauseSession(session.id);
    manager.resumeSession(session.id);
    expect(manager.getSession(session.id)!.status).toBe('ACTIVE');
  });

  it('deleteSession removes session', () => {
    const manager = new ExplorationSessionManager();
    const session = manager.createSession('FIND nodes', 'BFS');
    manager.deleteSession(session.id);
    expect(manager.getSession(session.id)).toBeUndefined();
  });

  it('listSessions returns all sessions', () => {
    const manager = new ExplorationSessionManager();
    manager.createSession('q1', 'BFS');
    manager.createSession('q2', 'DFS');
    expect(manager.listSessions().length).toBe(2);
  });

  it('clearCompleted removes completed/cancelled', () => {
    const manager = new ExplorationSessionManager();
    const s1 = manager.createSession('q1', 'BFS');
    const s2 = manager.createSession('q2', 'BFS');
    manager.updateStatus(s1.id, 'COMPLETED');
    manager.clearCompleted();
    expect(manager.getSession(s1.id)).toBeUndefined();
    expect(manager.getSession(s2.id)).toBeDefined();
  });

  it('getHistory returns history instance', () => {
    const manager = new ExplorationSessionManager();
    expect(manager.getHistory()).toBeInstanceOf(ExplorationHistory);
  });

  it('getBookmarks returns bookmarks instance', () => {
    const manager = new ExplorationSessionManager();
    expect(manager.getBookmarks()).toBeInstanceOf(ExplorationBookmarks);
  });

  it('getCheckpoints returns checkpoints instance', () => {
    const manager = new ExplorationSessionManager();
    expect(manager.getCheckpoints()).toBeInstanceOf(ExplorationCheckpoints);
  });
});

describe('ExplorationState', () => {
  it('markVisited adds to visited set', () => {
    const state = new ExplorationState();
    state.markVisited('A');
    expect(state.isVisited('A')).toBe(true);
  });

  it('isVisited returns false for unvisited', () => {
    const state = new ExplorationState();
    expect(state.isVisited('UNKNOWN')).toBe(false);
  });

  it('addStep records step', () => {
    const state = new ExplorationState();
    state.addStep({ nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} });
    expect(state.getStepCount()).toBe(1);
  });

  it('getVisited returns all visited nodes', () => {
    const state = new ExplorationState();
    state.markVisited('A');
    state.markVisited('B');
    expect(state.getVisited()).toEqual(['A', 'B']);
  });

  it('setDepth updates depth', () => {
    const state = new ExplorationState();
    state.setDepth(5);
    expect(state.getDepth()).toBe(5);
  });

  it('snapshot captures current state', () => {
    const state = new ExplorationState();
    state.markVisited('A');
    state.setDepth(1);
    const snap = state.snapshot();
    expect(snap.visited).toContain('A');
    expect(snap.depth).toBe(1);
  });

  it('restore reinstates state', () => {
    const state = new ExplorationState();
    state.restore({ visited: ['A', 'B'], steps: [], depth: 2 });
    expect(state.getVisited()).toContain('A');
    expect(state.getDepth()).toBe(2);
  });

  it('clear resets state', () => {
    const state = new ExplorationState();
    state.markVisited('A');
    state.clear();
    expect(state.getVisited().length).toBe(0);
  });
});

describe('ExplorationHistory', () => {
  it('record adds entry', () => {
    const history = new ExplorationHistory();
    history.record({ id: 's1', query: 'FIND nodes', status: 'ACTIVE', strategy: 'BFS', startNode: null, visited: [], bookmarks: [], checkpoint: null, createdAt: '', updatedAt: '' });
    expect(history.getHistory().length).toBe(1);
  });

  it('getHistory filters by session', () => {
    const history = new ExplorationHistory();
    history.record({ id: 's1', query: 'q1', status: 'ACTIVE', strategy: 'BFS', startNode: null, visited: [], bookmarks: [], checkpoint: null, createdAt: '', updatedAt: '' });
    history.record({ id: 's2', query: 'q2', status: 'ACTIVE', strategy: 'BFS', startNode: null, visited: [], bookmarks: [], checkpoint: null, createdAt: '', updatedAt: '' });
    expect(history.getHistory('s1').length).toBe(1);
  });

  it('getRecent returns last N entries', () => {
    const history = new ExplorationHistory();
    history.record({ id: 's1', query: 'q1', status: 'ACTIVE', strategy: 'BFS', startNode: null, visited: [], bookmarks: [], checkpoint: null, createdAt: '', updatedAt: '' });
    history.record({ id: 's2', query: 'q2', status: 'ACTIVE', strategy: 'BFS', startNode: null, visited: [], bookmarks: [], checkpoint: null, createdAt: '', updatedAt: '' });
    expect(history.getRecent(1).length).toBe(1);
  });

  it('clear removes all entries', () => {
    const history = new ExplorationHistory();
    history.record({ id: 's1', query: 'q1', status: 'ACTIVE', strategy: 'BFS', startNode: null, visited: [], bookmarks: [], checkpoint: null, createdAt: '', updatedAt: '' });
    history.clear();
    expect(history.getHistory().length).toBe(0);
  });
});

describe('ExplorationBookmarks', () => {
  it('addBookmark stores bookmark', () => {
    const bookmarks = new ExplorationBookmarks();
    bookmarks.addBookmark('s1', 'A', 'start node');
    expect(bookmarks.getBookmarks('s1').length).toBe(1);
  });

  it('addBookmark updates existing', () => {
    const bookmarks = new ExplorationBookmarks();
    bookmarks.addBookmark('s1', 'A', 'old');
    bookmarks.addBookmark('s1', 'A', 'new');
    expect(bookmarks.getBookmarks('s1')[0]!.label).toBe('new');
  });

  it('removeBookmark removes entry', () => {
    const bookmarks = new ExplorationBookmarks();
    bookmarks.addBookmark('s1', 'A', 'start');
    bookmarks.removeBookmark('s1', 'A');
    expect(bookmarks.getBookmarks('s1').length).toBe(0);
  });

  it('getAllBookmarks returns all', () => {
    const bookmarks = new ExplorationBookmarks();
    bookmarks.addBookmark('s1', 'A', 'start');
    const all = bookmarks.getAllBookmarks();
    expect(all.size).toBe(1);
  });

  it('clearSession removes session bookmarks', () => {
    const bookmarks = new ExplorationBookmarks();
    bookmarks.addBookmark('s1', 'A', 'start');
    bookmarks.clearSession('s1');
    expect(bookmarks.getBookmarks('s1').length).toBe(0);
  });
});

describe('ExplorationCheckpoints', () => {
  it('createCheckpoint stores state', () => {
    const checkpoints = new ExplorationCheckpoints();
    const id = checkpoints.createCheckpoint('s1', 'cp1', { steps: [], visited: ['A'], depth: 1 });
    expect(id).toBe('cp1');
  });

  it('restoreCheckpoint returns state', () => {
    const checkpoints = new ExplorationCheckpoints();
    checkpoints.createCheckpoint('s1', 'cp1', { steps: [], visited: ['A'], depth: 1 });
    const state = checkpoints.restoreCheckpoint('s1', 'cp1');
    expect(state!.visited).toContain('A');
  });

  it('restoreCheckpoint returns undefined for missing', () => {
    const checkpoints = new ExplorationCheckpoints();
    expect(checkpoints.restoreCheckpoint('s1', 'unknown')).toBeUndefined();
  });

  it('deleteCheckpoint removes checkpoint', () => {
    const checkpoints = new ExplorationCheckpoints();
    checkpoints.createCheckpoint('s1', 'cp1', { steps: [], visited: [], depth: 0 });
    checkpoints.deleteCheckpoint('s1', 'cp1');
    expect(checkpoints.listCheckpoints('s1').length).toBe(0);
  });

  it('listCheckpoints returns checkpoint labels', () => {
    const checkpoints = new ExplorationCheckpoints();
    checkpoints.createCheckpoint('s1', 'cp1', { steps: [], visited: [], depth: 0 });
    expect(checkpoints.listCheckpoints('s1')).toContain('cp1');
  });
});

describe('ExplorationReplay', () => {
  it('replaySession creates new session with same query', () => {
    const manager = new ExplorationSessionManager();
    const replay = new ExplorationReplay(manager);
    const original = manager.createSession('FIND nodes', 'BFS', 'A');
    const replayed = replay.replaySession(original.id);
    expect(replayed.query).toBe('FIND nodes');
    expect(replayed.id).not.toBe(original.id);
  });

  it('replaySession throws for missing session', () => {
    const manager = new ExplorationSessionManager();
    const replay = new ExplorationReplay(manager);
    expect(() => replay.replaySession('unknown')).toThrow();
  });

  it('compareReplays compares two sessions', () => {
    const manager = new ExplorationSessionManager();
    const replay = new ExplorationReplay(manager);
    const a = manager.createSession('FIND nodes', 'BFS', 'A');
    const b = manager.createSession('FIND nodes', 'BFS', 'B');
    const result = replay.compareReplays(a.id, b.id);
    expect(result.differences.length).toBeGreaterThan(0);
  });

  it('compareReplays throws for missing sessions', () => {
    const manager = new ExplorationSessionManager();
    const replay = new ExplorationReplay(manager);
    expect(() => replay.compareReplays('unknown', 'unknown')).toThrow();
  });

  it('getReplayFingerprint returns hash', () => {
    const manager = new ExplorationSessionManager();
    const replay = new ExplorationReplay(manager);
    const session = manager.createSession('FIND nodes', 'BFS', 'A');
    const fp = replay.getReplayFingerprint(session.id);
    expect(typeof fp).toBe('string');
  });
});
