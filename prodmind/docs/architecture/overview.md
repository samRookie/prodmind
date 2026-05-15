# Architecture Overview

ProdMind is a local-first AI engineering intelligence platform.

## High-Level Flow

1. User uploads project ZIP
2. System extracts and sanitizes files
3. Parser extracts AST metadata and dependency graphs
4. Analyzer computes architecture insights
5. AI generates engineering intelligence
6. Results stored in SQLite graph database
7. Frontend visualizes insights

## Package Boundaries

| Package | Responsibility | Dependencies |
|---------|---------------|--------------|
| contracts | Zod schemas, TS types, DTOs, enums | zod |
| shared | Constants, utils, version info | none |
| core | Errors, logger, env config, pipeline types | contracts, shared |
| db | Drizzle client, schema definitions, migrations | contracts, shared |
| parser | AST extraction, hashing, sanitization | contracts, shared, core |
| ai | AI provider integration, analysis orchestration | contracts, shared, core, db |
| web | React UI, Zustand stores, TailwindCSS | contracts, core, shared, db |
| server | Hono API, routes, middleware | all packages |
