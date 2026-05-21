#!/usr/bin/env node

const REQUIRED_VARS = ['GEMINI_API_KEY'];
const OPTIONAL_WARN = ['DATABASE_URL', 'NODE_ENV', 'PORT', 'HOST', 'CORS_ORIGINS'];

let exitCode = 0;

function fail(message) {
  console.error(`FAIL: ${message}`);
  exitCode = 1;
}

function warn(message) {
  console.warn(`WARN: ${message}`);
}

console.log('=== ProdMind Environment Validation ===\n');

for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    fail(`Required env var '${key}' is not set`);
  } else if (String(process.env[key]).trim().length === 0) {
    fail(`Required env var '${key}' is set but empty`);
  } else {
    console.log(`  ✓ ${key} is set`);
  }
}

for (const key of OPTIONAL_WARN) {
  if (process.env[key]) {
    const val = String(process.env[key]);
    console.log(`  ✓ ${key} = ${val.length > 20 ? val.slice(0, 20) + '...' : val}`);
  } else {
    warn(`Optional env var '${key}' is not set (will use default)`);
  }
}

const ciMode = process.env['CI'] === 'true' || process.env['CI'] === '1';
if (ciMode && process.env['NODE_ENV'] === 'development') {
  warn('CI mode with NODE_ENV=development — consider using NODE_ENV=ci or production');
}

const conflictKeys = [];
if (process.env['FEATURE_STREAMING'] === 'false' && process.env['FEATURE_AI_ORCHESTRATION'] === 'true') {
  conflictKeys.push('FEATURE_AI_ORCHESTRATION requires FEATURE_STREAMING');
}

for (const conflict of conflictKeys) {
  fail(`Feature flag conflict: ${conflict}`);
}

console.log(`\n=== Validation ${exitCode === 0 ? 'PASSED' : 'FAILED'} ===`);
process.exit(exitCode);
