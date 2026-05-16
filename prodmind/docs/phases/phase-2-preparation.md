# Phase 2 Preparation — Hardening Pass

## Overview

This document captures the engineering decisions and rationale behind the pre-Phase-2 hardening pass. The goal is to ensure the repository is deterministic, lightweight, parsing-safe, and ready for large local file processing workloads.

## Runtime Constraints

| Constant | Value | Rationale |
|----------|-------|-----------|
| `MAX_UPLOAD_SIZE_MB` | 50 MB | Prevents OOM from large ZIP uploads |
| `MAX_EXTRACTION_SIZE_MB` | 200 MB | Limits decompression bomb surface |
| `MAX_FILE_COUNT` | 100 | Sanity cap on extracted file count |
| `MAX_PARSE_TIME_MS` | 30,000 | Per-file parse timeout |
| `MAX_WORKER_THREADS` | 4 | Matches typical CI/core count |
| `MAX_AST_FILE_SIZE_KB` | 500 KB | Skips files too large to parse |
| `MAX_GRAPH_NODES` | 50,000 | Bounds in-memory dependency graph |
| `MAX_GRAPH_EDGES` | 200,000 | Bounds edge explosion in dense repos |

These live in `@prodmind/core/runtime` (`packages/core/src/runtime/limits.ts`) as strongly-typed constants with derived byte helpers.

## Upload Constraints

- ZIP files only (`.zip` MIME enforced upstream)
- Max 50 MB per upload (configurable via `UPLOAD_LIMITS`)
- Extracted contents limited to 200 MB decompressed
- Max 100 files per extraction
- Path traversal attacks blocked via `isDangerousPath()` guard

## Parsing Constraints

- Files over 500 KB are skipped (no AST generation)
- Per-file parse timeout of 30 seconds
- Max AST depth of 50 levels
- Max 500 imports resolved per file
- Binary/dangerous extensions are excluded at the sanitizer layer

## Governance Philosophy

The runtime governance module (`packages/core/src/runtime/`) provides:

1. **Limits** — Centralized constant definitions with derived byte helpers
2. **Guards** — Pure functions for runtime policy enforcement (no IO, no side effects)
3. **Observability** — Lightweight timing, memory, and debug utilities

These are designed to be:
- **Testable** — Pure functions with no IO
- **Overridable** — Limits accept optional overrides
- **Composable** — Guards can be combined for complex policies

## Worker Strategy

The worker scaffolding (`packages/parser/src/workers/`) defines:

- **Strongly typed message contracts** — `WorkerRequest<T>` / `WorkerResponse<T>`
- **Deterministic lifecycle types** — `PENDING → RUNNING → COMPLETED | FAILED | CANCELLED`
- **Configuration types** — `WorkerPoolConfig` with defaults
- **No runtime pool logic yet** — Phase 2 will implement the actual thread pool

Why scaffolding first:
- Ensures type consistency across future worker implementations
- Allows testing of message serialization before pool logic exists
- Prevents architectural drift between different parsing workers

## Sanitization Strategy

The sanitizer module (`packages/parser/src/sanitizers/`) provides:

- **Ignored directories** — `node_modules`, `.git`, `dist`, `build`, `vendor`, etc.
- **Ignored files** — Config files, lock files, license files, etc.
- **Dangerous extensions** — Executables, libraries, system files, binaries
- **Composable rules** — `SanitizationRules` interface with defaults

Why `node_modules` and `.git` are excluded:
- **`node_modules/`**: Contains thousands of files, mostly transpiled/minified. Parsing these yields near-zero signal while consuming enormous resources. The dependency graph is captured via `package.json` parsing, not filesystem traversal.
- **`.git/`**: Contains compressed object store, not source code. Parsing would require decompression and yields no structural insight into the project.

Why deterministic parsing matters:
- Two runs on the same input must produce identical output
- Enables caching (AST cache, parser cache)
- Makes incremental parsing safe
- Reduces flaky analysis results
- Essential for diff-based analysis in future phases

## Current State

After the hardening pass:

- All runtime artifacts removed from disk and gitignored
- Node engine pinned to >=22.0.0
- ESLint configured with import ordering, unused exports detection (warn level), and boundary scaffolding
- Runtime governance module created with limits, guards, and observability
- Sanitizer scaffolding created for file filtering
- Worker infrastructure scaffolded for future AST processing
- `.gitignore` is comprehensive and future-proof

## Remaining Risks (Pre-Phase 2)

1. **No actual parsing logic yet** — Phase 2 must implement ZIP extraction, file traversal, and AST generation
2. **No worker pool runtime** — Worker scaffolding exists but pool orchestration is unimplemented
3. **No extraction logic** — Sanitization rules exist but the extraction pipeline is stubs
4. **ESLint boundaries not enforced** — Package boundary rules are scaffolded but not active
5. **No test coverage for new modules** — Tests must be written in Phase 2
