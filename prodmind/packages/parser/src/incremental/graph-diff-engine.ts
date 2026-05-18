import type { IncrementalGraphDiffResult, NodeRef, EdgeRef } from './diff-types.ts';
import { IncrementalGraphDiffError } from './diff-errors.ts';

interface BaseNode {
  id: string;
  filePath: string;
  fileHash: string | null;
  nodeType: string;
  symbolName: string | null;
}

interface BaseEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
}

function toNodeRef(n: BaseNode): NodeRef {
  return {
    id: n.id,
    filePath: n.filePath,
    fileHash: n.fileHash,
    nodeType: n.nodeType,
    symbolName: n.symbolName,
  };
}

function toEdgeRef(e: BaseEdge): EdgeRef {
  return {
    id: e.id,
    sourceNodeId: e.sourceNodeId,
    targetNodeId: e.targetNodeId,
    edgeType: e.edgeType,
  };
}

interface NodeIdentityKey {
  filePath: string;
  nodeType: string;
  symbolName: string | null;
}

function nodeIdentityKey(n: BaseNode): NodeIdentityKey {
  return {
    filePath: n.filePath,
    nodeType: n.nodeType,
    symbolName: n.symbolName,
  };
}

function nodeIdentityKeyString(k: NodeIdentityKey): string {
  return `${k.filePath}|${k.nodeType}|${k.symbolName ?? ''}`;
}

interface EdgeKey {
  sourcePath: string;
  targetPath: string;
  edgeType: string;
}

function edgeKeyFromNode(e: BaseEdge, nodeBySourceId: Map<string, string>, nodeByTargetId: Map<string, string>): EdgeKey | null {
  const sourcePath = nodeBySourceId.get(e.sourceNodeId);
  const targetPath = nodeByTargetId.get(e.targetNodeId);
  if (!sourcePath || !targetPath) return null;
  return { sourcePath, targetPath, edgeType: e.edgeType };
}

function edgeKeyString(k: EdgeKey): string {
  return `${k.sourcePath}|${k.targetPath}|${k.edgeType}`;
}

export class GraphDiffEngine {
  public diff(
    previousNodes: BaseNode[],
    previousEdges: BaseEdge[],
    currentNodes: BaseNode[],
    currentEdges: BaseEdge[],
  ): IncrementalGraphDiffResult {
    try {
      const prevIdentityMap = new Map<string, BaseNode>();
      for (const n of previousNodes) {
        prevIdentityMap.set(nodeIdentityKeyString(nodeIdentityKey(n)), n);
      }

      const currIdentityMap = new Map<string, BaseNode>();
      for (const n of currentNodes) {
        currIdentityMap.set(nodeIdentityKeyString(nodeIdentityKey(n)), n);
      }

      const prevByHash = new Map<string, BaseNode>();
      for (const n of previousNodes) {
        prevByHash.set(nodeIdentityKeyString(nodeIdentityKey(n)), n);
      }

      const addedNodes: NodeRef[] = [];
      const removedNodes: NodeRef[] = [];
      const modifiedNodes: NodeRef[] = [];
      const unchangedNodeIds: string[] = [];

      for (const [identityKey, current] of currIdentityMap) {
        if (!prevIdentityMap.has(identityKey)) {
          addedNodes.push(toNodeRef(current));
        } else {
          const previous = prevIdentityMap.get(identityKey)!;
          if (previous.fileHash !== current.fileHash) {
            modifiedNodes.push(toNodeRef(current));
          } else {
            unchangedNodeIds.push(current.id);
          }
        }
      }

      for (const [identityKey, previous] of prevIdentityMap) {
        if (!currIdentityMap.has(identityKey)) {
          removedNodes.push(toNodeRef(previous));
        }
      }

      const sortByPath = (a: NodeRef, b: NodeRef) => a.filePath.localeCompare(b.filePath);

      const nodeBySourceId = new Map<string, string>();
      const nodeByTargetId = new Map<string, string>();
      for (const n of currentNodes) {
        nodeBySourceId.set(n.id, n.filePath);
        nodeByTargetId.set(n.id, n.filePath);
      }

      const prevNodeBySourceId = new Map<string, string>();
      const prevNodeByTargetId = new Map<string, string>();
      for (const n of previousNodes) {
        prevNodeBySourceId.set(n.id, n.filePath);
        prevNodeByTargetId.set(n.id, n.filePath);
      }

      const prevEdgeSet = new Set<string>();
      for (const e of previousEdges) {
        const k = edgeKeyFromNode(e, prevNodeBySourceId, prevNodeByTargetId);
        if (k) prevEdgeSet.add(edgeKeyString(k));
      }

      const addedEdges: EdgeRef[] = [];
      const removedEdges: EdgeRef[] = [];

      const currEdgeSet = new Set<string>();
      for (const e of currentEdges) {
        const k = edgeKeyFromNode(e, nodeBySourceId, nodeByTargetId);
        if (k) {
          const ks = edgeKeyString(k);
          currEdgeSet.add(ks);
          if (!prevEdgeSet.has(ks)) {
            addedEdges.push(toEdgeRef(e));
          }
        }
      }

      for (const e of previousEdges) {
        const k = edgeKeyFromNode(e, prevNodeBySourceId, prevNodeByTargetId);
        if (k) {
          const ks = edgeKeyString(k);
          if (!currEdgeSet.has(ks)) {
            removedEdges.push(toEdgeRef(e));
          }
        }
      }

      addedNodes.sort(sortByPath);
      removedNodes.sort(sortByPath);
      modifiedNodes.sort(sortByPath);
      const sortEdges = (a: EdgeRef, b: EdgeRef) => `${a.sourceNodeId}|${a.targetNodeId}`.localeCompare(`${b.sourceNodeId}|${b.targetNodeId}`);
      addedEdges.sort(sortEdges);
      removedEdges.sort(sortEdges);

      return {
        addedNodes,
        removedNodes,
        modifiedNodes,
        unchangedNodeIds: unchangedNodeIds.sort(),
        addedEdges,
        removedEdges,
        totalPreviousNodes: previousNodes.length,
        totalCurrentNodes: currentNodes.length,
        totalPreviousEdges: previousEdges.length,
        totalCurrentEdges: currentEdges.length,
        hasNodeChanges: addedNodes.length > 0 || removedNodes.length > 0 || modifiedNodes.length > 0,
        hasEdgeChanges: addedEdges.length > 0 || removedEdges.length > 0,
      };
    } catch (err) {
      throw new IncrementalGraphDiffError(
        `Graph diff failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
