# ADR-002: Hono as HTTP Framework

**Status:** Accepted  
**Date:** 2026-05-15  
**Deciders:** Architecture Team  

## Context

The backend requires a lightweight, TypeScript-first HTTP framework that supports middleware, route groups, and can run in both Node.js and edge environments.

## Decision

Use **Hono** with `@hono/node-server` for local development.

### Rationale
- Ultralight (~14KB), faster than Express/Fastify in benchmarks
- First-class TypeScript support with Zod integration
- Middleware ecosystem (CORS, auth, logging)
- Can migrate to edge (Cloudflare Workers, etc.) without framework change
- Built-in OpenAPI support via `@hono/zod-openapi`

## Consequences

**Positive:**
- Minimal boilerplate for route definitions
- Easy to add Zod-based validation middleware
- Future-proof for edge deployment

**Negative:**
- Smaller ecosystem than Express (mitigated by narrow use case)
- Team must learn Hono-specific patterns
