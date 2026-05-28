import { describe, it, expect } from 'vitest';
import { RuntimeError, BootstrapError, ShutdownError, StartupTimeoutError } from '../../runtime/runtime-errors.ts';

describe('RuntimeError', () => {
  it('creates with message and code', () => {
    const err = new RuntimeError('test', 'TEST_CODE');
    expect(err.message).toBe('test');
    expect(err.code).toBe('TEST_CODE');
    expect(err.name).toBe('RuntimeError');
  });
});

describe('BootstrapError', () => {
  it('creates with component', () => {
    const err = new BootstrapError('failed', 'db');
    expect(err.component).toBe('db');
    expect(err.name).toBe('BootstrapError');
  });
});

describe('ShutdownError', () => {
  it('creates with component', () => {
    const err = new ShutdownError('failed', 'http');
    expect(err.component).toBe('http');
    expect(err.name).toBe('ShutdownError');
  });
});

describe('StartupTimeoutError', () => {
  it('creates with component and timeout', () => {
    const err = new StartupTimeoutError('db', 5000);
    expect(err.message).toContain('db');
    expect(err.message).toContain('5000');
    expect(err.name).toBe('StartupTimeoutError');
  });
});
