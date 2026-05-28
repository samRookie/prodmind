import type { NodeId, TraversalResult, TraversalStep } from '../types/index.ts';
import type { GraphContract } from '../contracts/index.ts';
import { BFSTraverser } from '../traversal/bfs-traverser.ts';
import { generateId, nowISO, generateFingerprint } from '../utils/index.ts';

export class SemanticTraversal {
  private graph: GraphContract;

  constructor(graph: GraphContract) {
    this.graph = graph;
  }

  public traverseByType(startNode: NodeId, targetType: string, maxDepth: number = 100): TraversalResult {
    const traverser = new BFSTraverser(this.graph);
    const result = traverser.traverse(startNode, { maxDepth });
    const matchingSteps = result.steps.filter((step) => {
      const node = this.graph.getNode(step.nodeId);
      return node && node.type === targetType;
    });
    const endNode = matchingSteps.length > 0 ? matchingSteps[0]!.nodeId : null;
    return {
      ...result,
      id: generateId('traversal'),
      endNode,
      timestamp: nowISO(),
      fingerprint: generateFingerprint([startNode, targetType, String(maxDepth)]),
    };
  }

  public traverseSemanticPath(startNode: NodeId, endNode: NodeId): TraversalResult {
    const traverser = new BFSTraverser(this.graph);
    const result = traverser.traverse(startNode, { maxDepth: 1000 });
    const endStep = result.steps.find((step) => step.nodeId === endNode);
    const pathSteps = this.reconstructPath(endStep, result.steps);
    return {
      ...result,
      id: generateId('traversal'),
      steps: pathSteps,
      endNode,
      depth: endStep ? endStep.depth : 0,
      timestamp: nowISO(),
      fingerprint: generateFingerprint([startNode, endNode]),
    };
  }

  public traverseByProperty(startNode: NodeId, property: string, value: unknown, maxDepth: number = 100): TraversalResult {
    const traverser = new BFSTraverser(this.graph);
    const result = traverser.traverse(startNode, { maxDepth });
    const matchingSteps = result.steps.filter((step) => {
      const node = this.graph.getNode(step.nodeId);
      return node && node.properties[property] === value;
    });
    const endNode = matchingSteps.length > 0 ? matchingSteps[0]!.nodeId : null;
    return {
      ...result,
      id: generateId('traversal'),
      endNode,
      timestamp: nowISO(),
      fingerprint: generateFingerprint([startNode, property, String(value), String(maxDepth)]),
    };
  }

  private reconstructPath(endStep: TraversalStep | undefined, steps: TraversalStep[]): TraversalStep[] {
    if (!endStep) return [];
    const path: TraversalStep[] = [];
    let current: TraversalStep | undefined = endStep;
    while (current) {
      path.unshift(current);
      current = current.parentId ? steps.find((s) => s.nodeId === current!.parentId) : undefined;
    }
    return path;
  }
}
