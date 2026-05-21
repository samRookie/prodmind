import type { ExecutionGraph, ExecutionNodeType } from '../contracts/execution-contracts.ts';
import { createExecutionEdge,createExecutionGraph, createExecutionNode } from '../contracts/execution-factories.ts';

export interface PlanInput {
  readonly description: string;
  readonly nodes?: readonly PlannedNode[];
}

export interface PlannedNode {
  readonly id: string;
  readonly type: ExecutionNodeType;
  readonly label: string;
  readonly dependencies?: readonly string[];
  readonly config?: Record<string, unknown>;
}

export class ExecutionPlanner {
  plan(input: PlanInput): ExecutionGraph {
    if (input.nodes && input.nodes.length > 0) {
      return this.buildFromNodes(input.nodes);
    }
    return this.planFromDescription(input.description);
  }

  planChain(steps: readonly string[]): ExecutionGraph {
    const nodes = steps.map((label, i) => ({
      id: `step_${i + 1}`,
      type: 'prompt' as ExecutionNodeType,
      label,
      dependencies: i > 0 ? [`step_${i}`] : [],
    }));
    return this.buildFromNodes(nodes);
  }

  planFanOut(root: string, leaves: readonly string[]): ExecutionGraph {
    const nodes: PlannedNode[] = [
      { id: 'root', type: 'prompt', label: root },
      ...leaves.map((label, i) => ({
        id: `leaf_${i + 1}`,
        type: 'transform' as ExecutionNodeType,
        label,
        dependencies: ['root'],
      })),
    ];
    return this.buildFromNodes(nodes);
  }

  planPipeline(stages: readonly { label: string; type: ExecutionNodeType }[]): ExecutionGraph {
    const nodes: PlannedNode[] = stages.map((stage, i) => ({
      id: stage.label.toLowerCase().replace(/\s+/g, '_'),
      type: stage.type,
      label: stage.label,
      dependencies: i > 0 ? [stages[i - 1]!.label.toLowerCase().replace(/\s+/g, '_')] : [],
    }));
    return this.buildFromNodes(nodes);
  }

  private buildFromNodes(planned: readonly PlannedNode[]): ExecutionGraph {
    const nodes = planned.map(n =>
      createExecutionNode({
        id: n.id,
        type: n.type,
        label: n.label,
        dependencies: n.dependencies,
        config: n.config,
      }),
    );

    const edges = planned.flatMap(n =>
      (n.dependencies ?? []).map(dep => createExecutionEdge({ source: dep, target: n.id })),
    );

    return createExecutionGraph({ nodes, edges });
  }

  private planFromDescription(_description: string): ExecutionGraph {
    const node = createExecutionNode({ id: 'task', type: 'prompt', label: _description });
    return createExecutionGraph({ nodes: [node] });
  }
}
