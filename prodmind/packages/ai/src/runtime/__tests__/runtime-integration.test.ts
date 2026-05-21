import { describe, expect, it } from 'vitest';

import { createRuntimeExecutionRequest } from '../contracts/runtime-contracts.ts';
import { createMockRuntime } from '../mock/mock-runtime.ts';

function makeRequest(executionId = 'exec-1') {
  return createRuntimeExecutionRequest({
    executionId,
    provider: 'mock',
    model: 'mock-v1',
    prompt: 'test prompt',
    correlationId: 'corr-1',
  });
}

describe('Runtime Integration (Sandbox → Mock)', () => {
  it('mock runtime succeeds on valid request', async () => {
    const runtime = createMockRuntime();
    const result = await runtime.execute(makeRequest());
    expect(result.success).toBe(true);
    expect(result.result.request.executionId).toBe('exec-1');
    expect(result.result.metrics.finalLifecycleStage).toBe('COMPLETED');
  });

  it('mock runtime records telemetry', async () => {
    const runtime = createMockRuntime();
    await runtime.execute(makeRequest('exec-1'));
    const telemetry = runtime.sandbox.getTelemetry();
    expect(telemetry.length).toBeGreaterThanOrEqual(1);
    expect(telemetry[0]?.executionId).toBe('exec-1');
  });

  it('mock runtime can be configured to always fail', async () => {
    const runtime = createMockRuntime({ alwaysFail: true });
    const result = await runtime.execute(makeRequest());
    expect(result.success).toBe(false);
  });

  it('mock runtime respects fault modes', async () => {
    const runtime = createMockRuntime({ faultMode: 'governance_rejection' });
    const result = await runtime.execute(makeRequest());
    expect(result.success).toBe(false);
  });

  it('sandbox executes and returns lifecycle stages', async () => {
    const runtime = createMockRuntime();
    const result = await runtime.execute(makeRequest());
    expect(result.result.metrics.finalLifecycleStage).toBe('COMPLETED');
  });

  it('sandbox health snapshot reflects state', () => {
    const runtime = createMockRuntime();
    const health = runtime.sandbox.getHealth();
    expect(health.status).toBe('healthy');
    expect(typeof health.uptimeMs).toBe('number');
  });

  it('replay mode records results', async () => {
    const runtime = createMockRuntime();
    runtime.sandbox.enableReplay();
    await runtime.execute(makeRequest('replay-exec'));
    const recorded = runtime.sandbox.replay.lookup('replay-exec');
    expect(recorded).toBeDefined();
    expect(recorded?.fingerprint).toBeDefined();
    runtime.sandbox.disableReplay();
  });

  it('validation engine rejects invalid requests', async () => {
    const runtime = createMockRuntime();
    runtime.sandbox.validation.addRule({
      name: 'required-field',
      validate: (req) => req.prompt.length === 0 ? 'prompt required' : null,
    });
    const valid = await runtime.execute(makeRequest());
    expect(valid.success).toBe(true);
  });

  it('validation rule can reject', async () => {
    const runtime = createMockRuntime();
    runtime.sandbox.validation.addRule({
      name: 'reject-all',
      validate: () => 'rejected',
    });
    const result = await runtime.execute(makeRequest());
    expect(result.success).toBe(false);
  });

  it('scheduling decision is recorded', async () => {
    const runtime = createMockRuntime();
    const result = await runtime.execute(makeRequest('sched-exec'));
    expect(result.result.request.executionId).toBe('sched-exec');
  });

  it('mock runtime config can be updated mid-flight', async () => {
    const runtime = createMockRuntime();
    const r1 = await runtime.execute(makeRequest('a'));
    expect(r1.success).toBe(true);
    runtime.setConfig({ alwaysFail: true });
    const r2 = await runtime.execute(makeRequest('b'));
    expect(r2.success).toBe(false);
  });
});
