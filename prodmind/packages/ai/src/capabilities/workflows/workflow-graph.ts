export interface WorkflowNode {
  readonly id: string;
  readonly toolId: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly dependsOn: readonly string[];
}

export class WorkflowGraph {
  private readonly _nodes: WorkflowNode[] = [];

  addNode(id: string, toolId: string, input: Readonly<Record<string, unknown>>, dependsOn?: readonly string[]): void {
    this._nodes.push(Object.freeze({
      id, toolId, input: Object.freeze({ ...input }),
      dependsOn: Object.freeze(dependsOn ? [...dependsOn] : []),
    }));
  }

  get nodes(): readonly WorkflowNode[] {
    return Object.freeze([...this._nodes]);
  }

  getNode(id: string): WorkflowNode | undefined {
    return this._nodes.find(n => n.id === id);
  }

  getReadyNodes(completedIds: readonly string[]): readonly WorkflowNode[] {
    return Object.freeze(
      this._nodes.filter(n =>
        !completedIds.includes(n.id) &&
        n.dependsOn.every(d => completedIds.includes(d)),
      ).sort((a, b) => a.id.localeCompare(b.id)),
    );
  }

  get count(): number {
    return this._nodes.length;
  }

  clear(): void {
    this._nodes.length = 0;
  }
}
