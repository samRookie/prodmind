import { envSchema } from '../packages/core/src/config/env.ts';
import { limitsSchema } from '../packages/core/src/config/limits.ts';

const REQUIRED_VARS = ['GEMINI_API_KEY'];
const OPTIONAL_WARN = ['DATABASE_URL', 'NODE_ENV', 'PORT', 'HOST', 'CORS_ORIGINS'];

let exitCode = 0;

function fail(message: string): void {
  console.error(`FAIL: ${message}`);
  exitCode = 1;
}

function warn(message: string): void {
  console.warn(`WARN: ${message}`);
}

console.log('=== ProdMind Environment Validation ===\n');

const source = process.env;

for (const key of REQUIRED_VARS) {
  if (!source[key]) {
    fail(`Required env var '${key}' is not set`);
  } else if (source[key]!.trim().length === 0) {
    fail(`Required env var '${key}' is set but empty`);
  } else {
    console.log(`  ✓ ${key} is set`);
  }
}

for (const key of OPTIONAL_WARN) {
  if (source[key]) {
    console.log(`  ✓ ${key} = ${source[key]!.length > 20 ? source[key]!.slice(0, 20) + '...' : source[key]}`);
  } else {
    warn(`Optional env var '${key}' is not set (will use default)`);
  }
}

const envResult = envSchema.safeParse(source);
if (!envResult.success) {
  fail('Environment schema validation failed:');
  for (const issue of envResult.error.issues) {
    fail(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
} else {
  console.log('\n  ✓ Environment schema validates');
}

const limits = limitsSchema.safeParse({});
if (!limits.success) {
  fail('Limits schema validation failed');
} else {
  console.log('  ✓ Limits schema validates');
}

const ciMode = source['CI'] === 'true' || source['CI'] === '1';
if (ciMode && source['NODE_ENV'] === 'development') {
  warn('CI mode with NODE_ENV=development — consider using NODE_ENV=ci or production');
}

console.log(`\n=== Validation ${exitCode === 0 ? 'PASSED' : 'FAILED'} ===`);
process.exit(exitCode);
