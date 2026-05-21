import type { RuntimeBudget, RuntimeExecutionRequest, RuntimePolicy } from '../contracts/runtime-contracts.ts';
import { createRuntimeBudget } from '../contracts/runtime-contracts.ts';

export class RuntimeBudgetTracker {
  private usedBudget = 0;
  private readonly budgetLimit: number;

  constructor(policy: RuntimePolicy) {
    this.budgetLimit = policy.maxTokenBudget;
  }

  estimate(request: RuntimeExecutionRequest): RuntimeBudget {
    const promptTokens = Math.ceil(request.prompt.length / 4);
    const contextTokens = request.systemPrompt
      ? Math.ceil(request.systemPrompt.length / 4)
      : 0;

    return createRuntimeBudget({
      promptTokens,
      contextTokens,
      totalBudget: this.budgetLimit,
    });
  }

  consume(budget: RuntimeBudget): boolean {
    const cost = budget.promptTokens + budget.contextTokens;
    if (this.usedBudget + cost > this.budgetLimit) {
      return false;
    }
    this.usedBudget += Math.ceil(cost * budget.retryAmplification);
    return true;
  }

  getRemaining(): number {
    return this.budgetLimit - this.usedBudget;
  }

  getUsed(): number {
    return this.usedBudget;
  }

  getUtilization(): number {
    return this.budgetLimit > 0 ? this.usedBudget / this.budgetLimit : 0;
  }

  reset(): void {
    this.usedBudget = 0;
  }
}
