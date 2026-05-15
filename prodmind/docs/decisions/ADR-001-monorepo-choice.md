# ADR-001: Monorepo Architecture Choice

**Status:** Accepted  
**Date:** 2026-05-15  
**Deciders:** Architecture Team  

## Context

ProdMind requires multiple tightly-coupled packages (parser, AI, DB, contracts) shared between frontend and backend. Managing these as separate repositories would introduce synchronization overhead and reduce developer velocity.

## Decision

Use **pnpm workspaces** with **Turborepo** as the monorepo orchestration layer.

### Rationale
- pnpm: strict dependency isolation, workspace protocol, fast installs
- Turborepo: parallel task execution, caching, dependency-aware pipeline
- Single repo: atomic cross-package changes, unified CI, shared tooling

## Consequences

**Positive:**
- TypeScript project references work naturally across packages
- Contracts package serves as single source of truth
- CI can typecheck all packages in parallel

**Negative:**
- Requires disciplined package boundaries to avoid coupling
- All teams must follow the same dependency graph rules
