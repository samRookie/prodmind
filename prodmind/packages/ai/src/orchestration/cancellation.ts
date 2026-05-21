export class CancellationScope {
  private readonly abortController: AbortController;
  private readonly children: CancellationScope[];
  private cancelledReason: string | null;

  public constructor(externalSignal?: AbortSignal, parent?: CancellationScope) {
    this.abortController = new AbortController();
    this.children = [];
    this.cancelledReason = null;

    if (parent) {
      parent.children.push(this);
    }

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => {
        this.cancel('External signal aborted');
      }, { once: true });
    }
  }

  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  public get isCancelled(): boolean {
    return this.abortController.signal.aborted;
  }

  public get reason(): string | null {
    return this.cancelledReason;
  }

  public cancel(reason?: string): void {
    if (this.isCancelled) return;

    for (const child of this.children) {
      child.cancel(reason);
    }

    this.cancelledReason = reason ?? 'Cancelled';
    this.abortController.abort(new DOMException(this.cancelledReason, 'AbortError'));
  }

  public createChildScope(): CancellationScope {
    return new CancellationScope(undefined, this);
  }

  public cancelAll(): void {
    for (const child of this.children) {
      child.cancelAll();
    }
    this.cancel('Cancelled by parent');
  }
}

export function createCancellationScope(): CancellationScope {
  return new CancellationScope();
}
