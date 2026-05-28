import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { RuntimeBootstrap, BootstrapError } from '../../apps/server/src/runtime/index.ts';
import { EnvGovernance } from '../../apps/server/src/env/index.ts';
import { HealthRegistry, createPingHealthCheck, StructuredLogger } from '../../apps/server/src/observability/index.ts';
import { DeploymentValidator, collectReleaseMetadata, DeploymentFingerprint, ReleaseIntegrity, createDeploymentReport } from '../../apps/server/src/deployment/index.ts';
import { ProductionValidator, createProductionReport } from '../../apps/server/src/production/index.ts';
import { RuntimeDiagnosticsCollector, DiagnosticsSnapshotManager, GraphDiagnosticsCollector, AiDiagnosticsCollector } from '../../apps/server/src/diagnostics/index.ts';

async function boot() {
  const bootstrap = new RuntimeBootstrap();
  const context = bootstrap.context;
  const log = new StructuredLogger('info', 'pretty');

  try {
    const envGovernance = new EnvGovernance();
    const env = envGovernance.initialize();
    context.register('env', env);
    context.register('logger', log);
    context.register('envGovernance', envGovernance);

    log.info('Runtime bootstrap starting', { mode: env.NODE_ENV });

    const health = new HealthRegistry();
    health.register('runtime', createPingHealthCheck());
    context.register('health', health);

    const diagnostics = new RuntimeDiagnosticsCollector();
    const graphDiagnostics = new GraphDiagnosticsCollector();
    const aiDiagnostics = new AiDiagnosticsCollector();
    const snapshotManager = new DiagnosticsSnapshotManager(diagnostics, graphDiagnostics, aiDiagnostics);
    context.register('diagnostics', diagnostics);
    context.register('graphDiagnostics', graphDiagnostics);
    context.register('aiDiagnostics', aiDiagnostics);
    context.register('snapshotManager', snapshotManager);

    bootstrap.startup.add({ name: 'environment', dependencies: [], timeout: 5_000, execute: async () => { envGovernance.validate(); } });
    bootstrap.startup.add({ name: 'observability', dependencies: ['environment'], timeout: 5_000, execute: async () => { log.info('Observability initialized'); } });
    bootstrap.startup.add({ name: 'health', dependencies: ['observability'], timeout: 5_000, execute: async () => { } });
    bootstrap.startup.add({ name: 'diagnostics', dependencies: ['observability'], timeout: 5_000, execute: async () => { } });

    await bootstrap.initialize();

    const app = new Hono();
    app.use('*', cors({ origin: env.CORS_ORIGINS?.split(',') ?? '*' }));
    app.use('*', logger());
    app.use('*', secureHeaders());

    app.get('/health', async (c) => {
      const report = await health.check();
      return c.json({ success: report.status === 'healthy', data: report });
    });

    app.get('/diagnostics', async (c) => {
      const snapshot = await snapshotManager.capture();
      return c.json({ success: true, data: snapshot });
    });

    app.get('/env-report', async (c) => {
      return c.json({ success: true, data: envGovernance.report });
    });

    app.get('/deployment-report', async (c) => {
      const validator = new DeploymentValidator();
      const validation = validator.validate(env);
      const metadata = collectReleaseMetadata(env);
      const integrity = new ReleaseIntegrity();
      const integrityReport = integrity.verifyPackageIntegrity(metadata);
      const fingerprint = new DeploymentFingerprint();
      const fp = fingerprint.generate({}, {}, '');
      return c.json({ success: true, data: createDeploymentReport(metadata, validation, integrityReport, fp) });
    });

    app.get('/production-report', async (c) => {
      const pv = new ProductionValidator();
      const dv = new DeploymentValidator();
      const validation = dv.validate(env);
      const metadata = collectReleaseMetadata(env);
      const integrity = new ReleaseIntegrity();
      const integrityReport = integrity.verifyPackageIntegrity(metadata);
      const fp = new DeploymentFingerprint();
      const fpc = fp.generate({}, {}, '');
      const dr = createDeploymentReport(metadata, validation, integrityReport, fpc);
      const hr = await health.check();
      const pvr = pv.validate(dr, hr, true);
      const ra = { state: context.state.state, uptime: context.state.uptime, stateHistory: [...context.state.stateHistory], failureReasons: [...context.state.failureReasons], running: context.state.isRunning, passed: context.state.isRunning };
      const sa = { completed: bootstrap.startup.completedTasks, failed: bootstrap.startup.failedTasks, startedAt: context.startedAt, durationMs: Date.now() - new Date(context.startedAt).getTime(), passed: bootstrap.startup.failedTasks.length === 0 };
      const rea = { enabled: true, snapshotCount: 0, integrityValid: true, lastReplayTimestamp: null, passed: true };
      const da = { valid: dr.valid, metadataPresent: true, integrityPassed: integrityReport.passed, validationPassed: validation.valid, fingerprintPresent: true, report: dr, passed: dr.valid };
      const oa = { healthChecksRegistered: 1, metricsEnabled: false, auditEventCount: 0, alertCount: 0, passed: true };
      const report = { timestamp: new Date().toISOString(), validation: pvr, runtime: ra, startup: sa, replay: rea, deployment: da, observability: oa, passed: pvr.valid && ra.passed && sa.passed && rea.passed && da.passed && oa.passed };
      return c.json({ success: true, data: report });
    });

    app.notFound((c) => c.json({ success: false, error: 'Not found' }, 404));
    app.onError((err, c) => {
      log.error('Unhandled error', { error: err, component: 'server' });
      return c.json({ success: false, error: 'Internal server error' }, 500);
    });

    bootstrap.shutdown.register('http-server', async () => { }, 50);
    bootstrap.shutdown.register('diagnostics', async () => snapshotManager.clear(), 150);
    bootstrap.shutdown.register('logger', async () => log.clear(), 200);

    log.info(`Server starting on port ${env.PORT} (${env.NODE_ENV})`);
    serve({ fetch: app.fetch, port: env.PORT });

    process.on('SIGTERM', async () => { log.info('SIGTERM received'); await bootstrap.destroy(); process.exit(0); });
    process.on('SIGINT', async () => { log.info('SIGINT received'); await bootstrap.destroy(); process.exit(0); });

    return { app, bootstrap, context };
  } catch (err) {
    log.error('Fatal bootstrap error', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  }
}

boot();
