# ADR-003: Contracts-First Architecture

**Status:** Accepted  
**Date:** 2026-05-15  
**Deciders:** Architecture Team  

## Context

In an AI-assisted codebase, type drift between frontend, backend, and AI components is a constant risk. Without a single source of truth for data shapes, AI-generated code will produce incompatible interfaces.

## Decision

All inter-package communication MUST go through the `@prodmind/contracts` package. No component may define its own DTOs, API response shapes, or validation schemas outside of contracts.

### Structure
- `contracts/src/schemas/` — Zod runtime validation schemas
- `contracts/src/types/` — Pure TypeScript type exports
- `contracts/src/dto/` — Data Transfer Objects for API boundaries
- `contracts/src/enums/` — Shared enums (Severity, ProjectStatus, etc.)

## Consequences

**Positive:**
- Single source of truth for all data shapes
- Frontend can import types without pulling in backend dependencies
- Zod schemas serve as both validation and OpenAPI generation source

**Negative:**
- Contracts changes require coordinated updates across consumers
- Must resist the urge to bypass contracts for "convenience"
