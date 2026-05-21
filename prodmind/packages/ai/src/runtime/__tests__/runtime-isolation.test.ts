import { describe, expect, it } from 'vitest';

import { createRuntimeFailureRecord } from '../contracts/runtime-contracts.ts';
import { RuntimeIsolation } from '../isolation/runtime-isolation.ts';

describe('RuntimeIsolation', () => {
  it('defaults to logical isolation', () => {
    const iso = new RuntimeIsolation();
    expect(iso.isolationLevel).toBe('logical');
  });

  it('contains non-recoverable failures at logical level', () => {
    const iso = new RuntimeIsolation('logical');
    const failure = createRuntimeFailureRecord({ failureClass: 'timeout', message: 't', stage: 'EXECUTING', code: 'T1', recoverable: false });
    expect(iso.contains(failure)).toBe(true);
  });

  it('does not contain recoverable failures at logical level', () => {
    const iso = new RuntimeIsolation('logical');
    const failure = createRuntimeFailureRecord({ failureClass: 'timeout', message: 't', stage: 'EXECUTING', code: 'T1', recoverable: true });
    expect(iso.contains(failure)).toBe(false);
  });

  it('does not contain any failures at none level', () => {
    const iso = new RuntimeIsolation('none');
    const failure = createRuntimeFailureRecord({ failureClass: 'timeout', message: 't', stage: 'EXECUTING', code: 'T1', recoverable: false });
    expect(iso.contains(failure)).toBe(false);
  });

  it('cascade propagates at none level', () => {
    const iso = new RuntimeIsolation('none');
    const failure = createRuntimeFailureRecord({ failureClass: 'timeout', message: 't', stage: 'EXECUTING', code: 'T1', recoverable: false });
    const cascaded = iso.cascade(failure);
    expect(cascaded).toHaveLength(1);
    expect(cascaded[0]?.code).toBe('T1_CASCADED');
  });

  it('cascade does not propagate at logical level', () => {
    const iso = new RuntimeIsolation('logical');
    const failure = createRuntimeFailureRecord({ failureClass: 'timeout', message: 't', stage: 'EXECUTING', code: 'T1', recoverable: false });
    const cascaded = iso.cascade(failure);
    expect(cascaded).toHaveLength(0);
  });
});
