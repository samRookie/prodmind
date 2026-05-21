# Configuration Governance Architecture

## Overview

Configuration governance provides a deterministic, typed, and validated config layer
for all ProdMind runtime settings. It ensures consistent behavior across local
development, CI, testing, and production environments.

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│                  ConfigRegistry                  │
│  Singleton store for typed config namespaces     │
│  Deterministic loading, fingerprinting, freeze   │
├─────────────────────────────────────────────────┤
│  env.ts     │  limits.ts  │  feature-flags.ts    │
│  secrets.ts │ environment │  provider-config.ts  │
├─────────────────────────────────────────────────┤
│  Zod Schema Validation Layer                     │
│  All config values validated at load time        │
└─────────────────────────────────────────────────┘
```

## Key Components

### Config Registry (`packages/core/src/config/registry.ts`)
- Singleton config store
- Namespace-based registration with Zod schemas
- Deterministic loading (first-load-wins, frozen after load)
- `fingerprint()` returns SHA-256 hash of all loaded configs
- `snapshot()` returns all loaded config values

### Environment Validation (`packages/core/src/config/env.ts`)
- Zod schema for ALL environment variables
- Automatic `.env` file loading (no dotenv dependency)
- Required vars: `GEMINI_API_KEY`
- Optional vars: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`,
  `NODE_ENV`, `PORT`, `HOST`, `CORS_ORIGINS`, `LOG_LEVEL`, `DEBUG`
- Boolean coercion: `CI`, `MOCK_MODE`

### Environment Detection (`packages/core/src/config/environment.ts`)
- `RuntimeEnvironment` enum: `development | test | ci | production | mock`
- Detection order: `MOCK_MODE` → `CI` → `NODE_ENV`
- Guards: `isDevelopment()`, `isTest()`, `isCi()`, `isProduction()`, `isMock()`

### Runtime Limits (`packages/core/src/config/limits.ts`)
- Typed limits for all subsystems: upload, parse, graph, DB, server
- Default values as single source of truth
- Overridable via env or programmatic API (`getLimits()`)

### Secret Store (`packages/core/src/config/secrets.ts`)
- Centralized secret access layer
- Access logging for audit
- `mask(value)` for safe display
- `isSecretValue(value)` heuristic detection
- Integration with logger (`safeStringify` in logger/redactor.ts)

### Feature Flags (`packages/core/src/config/feature-flags.ts`)
- Typed flag definitions with descriptions
- Environment variable overrides (`FEATURE_*`)
- Deterministic defaults
- Replay-safe mode (non-replay-safe flags freeze during replay)
- Fingerprintable for execution determinism

## Environment Isolation

| Environment | Detection | Purpose |
|-------------|-----------|---------|
| development | `NODE_ENV=development` | Local dev, hot reload |
| test | `NODE_ENV=test` | Unit/integration tests |
| ci | `CI=true` | GitHub Actions |
| production | `NODE_ENV=production` | Production deployment |
| mock | `MOCK_MODE=true` | Replay, deterministic testing |

## Secret Handling

- All secrets accessed through `SecretStore` — never raw `process.env`
- Logger automatically redacts known secret fields via `safeStringify`
- Execution snapshots strip secrets from stored params
- Replay engine isolates from live provider configs

## Deterministic Execution Guarantees

1. **Config fingerprint**: SHA-256 of all loaded config namespaces
2. **Feature flag fingerprint**: SHA-256 of all active flags
3. **Replay determinism**: Replay engine freezes non-replay-safe flags
4. **Seeded PRNG**: Retry jitter uses `mulberry32` seeded PRNG
5. **Stable ordering**: All production `sort()` calls use explicit comparators
6. **No `Math.random()`**: Replaced with seeded PRNG in critical paths

## Environment Variable Reference

| Variable | Required | Type | Default | Description |
|----------|----------|------|---------|-------------|
| GEMINI_API_KEY | yes | string | - | Gemini API key |
| OPENAI_API_KEY | no | string | - | OpenAI API key |
| ANTHROPIC_API_KEY | no | string | - | Anthropic API key |
| DATABASE_URL | no | string | `file:./prodmind.db` | SQLite database path |
| NODE_ENV | no | enum | `development` | `development\|test\|ci\|production` |
| CI | no | boolean | `false` | CI environment flag |
| MOCK_MODE | no | boolean | `false` | Mock/replay mode |
| LOG_LEVEL | no | enum | `info` | `debug\|info\|warn\|error` |
| PORT | no | number | `3001` | Server port |
| HOST | no | string | `0.0.0.0` | Server host |
| CORS_ORIGINS | no | string | `http://localhost:5173` | Comma-separated origins |
| DEBUG | no | string | - | Debug namespace |

## CI Validation

The CI workflow (`node scripts/validate-env.mjs`) validates:
1. All required env vars are set
2. No conflicting feature flag values
3. No unsafe environment modes (e.g., CI with NODE_ENV=development)
