import type { RuntimeExecutionRequest } from '../contracts/runtime-contracts.ts';
import type { SandboxConfig, SandboxResult } from '../sandbox/runtime-sandbox.ts';
import { RuntimeSandbox } from '../sandbox/runtime-sandbox.ts';

export interface MockRuntimeConfig {
  readonly alwaysFail?: boolean;
  readonly simulateDelay?: boolean;
  readonly passThrough?: boolean;
  readonly faultMode?: 'none' | 'timeout' | 'governance_rejection' | 'budget_overflow' | 'validation_failure';
}

export interface MockRuntime {
  readonly sandbox: RuntimeSandbox;
  execute(request: RuntimeExecutionRequest): Promise<SandboxResult>;
  setConfig(config: Partial<MockRuntimeConfig>): void;
}

export function createMockRuntime(config?: MockRuntimeConfig, sandboxConfig?: SandboxConfig): MockRuntime {
  const innerConfig: MockRuntimeConfig = { ...config };
  const sandbox = new RuntimeSandbox(sandboxConfig);

  return {
    sandbox,

    async execute(request: RuntimeExecutionRequest): Promise<SandboxResult> {
      if (innerConfig.alwaysFail) {
        const sandboxResult = await sandbox.execute(request, {
          policy: { allowedProviders: [] },
        });
        return sandboxResult;
      }

      if (innerConfig.faultMode === 'timeout') {
        const sandboxResult = await sandbox.execute(request, {
          policy: { maxExecutionDurationMs: 1 },
        });
        return sandboxResult;
      }

      if (innerConfig.faultMode === 'governance_rejection') {
        const sandboxResult = await sandbox.execute(request, {
          policy: { allowedProviders: [] },
        });
        return sandboxResult;
      }

      if (innerConfig.faultMode === 'budget_overflow') {
        const sandboxResult = await sandbox.execute(request, {
          policy: { maxTokenBudget: 1 },
        });
        return sandboxResult;
      }

      return await sandbox.execute(request);
    },

    setConfig(config: Partial<MockRuntimeConfig>): void {
      Object.assign(innerConfig, config);
    },
  };
}
