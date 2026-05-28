import { DeploymentValidator, collectReleaseMetadata, ReleaseIntegrity, DeploymentFingerprint, createDeploymentReport } from '../../apps/server/src/deployment/index.ts';
import { EnvGovernance } from '../../apps/server/src/env/index.ts';

async function audit() {
  const governance = new EnvGovernance();
  const env = governance.initialize();

  const validator = new DeploymentValidator();
  const validation = validator.validate(env);
  const metadata = collectReleaseMetadata(env);
  const integrity = new ReleaseIntegrity();
  const integrityReport = integrity.verifyPackageIntegrity(metadata);
  const fingerprint = new DeploymentFingerprint();
  const fp = fingerprint.generate({}, {}, '');
  const report = createDeploymentReport(metadata, validation, integrityReport, fp);

  console.log(`Deployment valid: ${report.valid}`);
  console.log(`Release: ${metadata.version}@${metadata.commit.slice(0, 8)}`);
  console.log(`Integrity: ${integrityReport.passed ? 'PASS' : 'FAIL'}`);
  console.log(`Validation: ${validation.valid ? 'PASS' : 'FAIL'}`);

  if (!report.valid) {
    for (const f of validation.failed) console.error(`  FAIL: ${f.name} - ${f.message}`);
    for (const f of integrityReport.failed) console.error(`  FAIL: ${f.name} - expected ${f.expected}, got ${f.actual}`);
    process.exit(1);
  }
}

audit();
