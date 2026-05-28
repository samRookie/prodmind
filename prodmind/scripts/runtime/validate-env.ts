import { EnvGovernance } from '../../apps/server/src/env/index.ts';

function validate() {
  const governance = new EnvGovernance();
  const env = governance.initialize();
  const report = governance.report;

  console.log(`Mode: ${report.mode}`);
  console.log(`Valid: ${report.valid}`);

  if (report.errors.length > 0) {
    console.error('Errors:');
    for (const err of report.errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  if (report.warnings.length > 0) {
    console.warn('Warnings:');
    for (const w of report.warnings) console.warn(`  - ${w}`);
  }

  console.log(`Secrets loaded: ${report.secretsLoaded}`);
  console.log('Environment validation passed');
}

validate();
