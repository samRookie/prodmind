# ADR-004: Database Choice — SQLite + Drizzle + libSQL

**Status:** Accepted  
**Date:** 2026-05-15  
**Deciders:** Architecture Team  

## Context

ProdMind is a local-first platform. Projects are analyzed on the user's machine. A full client-server database (PostgreSQL, etc.) is unnecessary overhead for single-user analysis scenarios.

## Decision

Use **SQLite** via **@libsql/client** with **Drizzle ORM**.

### Rationale
- **@libsql/client**: zero native bindings, works on Windows/Mac/Linux without compilation issues
- **Drizzle ORM**: type-safe SQL, lightweight, supports SQLite natively
- No database server process required
- Schema-as-code with auto-generated migrations
- Future: can migrate to Turso (libSQL server) if needed

## Consequences

**Positive:**
- Zero infrastructure setup for development
- Fast test suite (in-memory SQLite)
- Deterministic schema via Drizzle

**Negative:**
- Not suitable for multi-user concurrent access (not needed for v1)
- Limited query optimization compared to PostgreSQL
