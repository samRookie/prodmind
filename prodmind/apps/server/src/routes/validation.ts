import { Hono } from 'hono';
import { createDrizzleClient, ValidationRepository } from '@prodmind/db';

const validationRouter = new Hono();

validationRouter.get('/:snapshotId', async (c) => {
  try {
    const snapshotId = c.req.param('snapshotId');
    if (!snapshotId) {
      return c.json({ success: false, error: 'snapshotId is required' }, 400);
    }

    const db = createDrizzleClient();
    const repo = new ValidationRepository(db);

    const [integrity, issues, summary] = await Promise.all([
      repo.getSnapshotIntegrity(snapshotId),
      repo.getValidationIssues(snapshotId),
      repo.getValidationSummary(snapshotId),
    ]);

    if (!integrity) {
      return c.json({ success: false, error: 'No validation data found for this snapshot' }, 404);
    }

    return c.json({
      success: true,
      data: {
        snapshotId,
        integrity: {
          integrityScore: integrity.integrityScore,
          readinessScore: integrity.readinessScore,
          validationState: integrity.validationState,
          criticalIssueCount: integrity.criticalIssueCount,
          warningCount: integrity.warningCount,
          createdAt: integrity.createdAt,
        },
        summary,
        issues,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return c.json({ success: false, error: message }, 500);
  }
});

validationRouter.get('/:snapshotId/issues', async (c) => {
  try {
    const snapshotId = c.req.param('snapshotId');
    const severity = c.req.query('severity');
    const category = c.req.query('category');

    if (!snapshotId) {
      return c.json({ success: false, error: 'snapshotId is required' }, 400);
    }

    const db = createDrizzleClient();
    const repo = new ValidationRepository(db);

    const options: { severity?: string; category?: string } = {};
    if (severity && ['INFO', 'WARNING', 'ERROR', 'CRITICAL'].includes(severity)) {
      options.severity = severity;
    }
    if (category) {
      options.category = category;
    }

    const issues = await repo.getValidationIssues(snapshotId, options);

    return c.json({ success: true, data: issues });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return c.json({ success: false, error: message }, 500);
  }
});

validationRouter.get('/:snapshotId/integrity', async (c) => {
  try {
    const snapshotId = c.req.param('snapshotId');
    if (!snapshotId) {
      return c.json({ success: false, error: 'snapshotId is required' }, 400);
    }

    const db = createDrizzleClient();
    const repo = new ValidationRepository(db);
    const integrity = await repo.getSnapshotIntegrity(snapshotId);

    if (!integrity) {
      return c.json({ success: false, error: 'No integrity data found for this snapshot' }, 404);
    }

    return c.json({ success: true, data: integrity });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return c.json({ success: false, error: message }, 500);
  }
});

validationRouter.get('/:snapshotId/readiness', async (c) => {
  try {
    const snapshotId = c.req.param('snapshotId');
    if (!snapshotId) {
      return c.json({ success: false, error: 'snapshotId is required' }, 400);
    }

    const db = createDrizzleClient();
    const repo = new ValidationRepository(db);

    const [integrity, criticalIssues] = await Promise.all([
      repo.getSnapshotIntegrity(snapshotId),
      repo.getCriticalIssues(snapshotId),
    ]);

    if (!integrity) {
      return c.json({ success: false, error: 'No validation data found for this snapshot' }, 404);
    }

    return c.json({
      success: true,
      data: {
        snapshotId,
        readinessScore: integrity.readinessScore,
        validationState: integrity.validationState,
        isReady: integrity.validationState !== 'INVALID',
        criticalIssues: criticalIssues.map((i) => ({
          issueCode: i.issueCode,
          message: i.message,
          category: i.category,
        })),
        blockerCount: criticalIssues.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return c.json({ success: false, error: message }, 500);
  }
});

export { validationRouter };
