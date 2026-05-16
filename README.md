# ProdMind

AI Architectural Intelligence Engine for Vibecoded Projects

## What is ProdMind?

ProdMind is a local-first AI engineering intelligence platform that analyzes, compresses, remembers, and reviews AI-generated software projects at production scale.

Unlike generic AI coding assistants that lose context as projects grow, ProdMind treats a codebase as a persistent architectural system. It builds a structured graph memory of the project using AST parsing, dependency analysis, metadata compression, and deterministic AI reasoning pipelines.

**Built for vibecoders** — developers shipping heavily AI-generated applications through Claude, Gemini, Cursor, Copilot, Antigravity, and other autonomous coding systems — where architectural entropy, hallucinations, context collapse, and production instability become critical problems.

## The Problem

As AI-generated codebases scale:
- Context windows collapse between development sessions
- Architectural relationships become implicit and unmapped
- Hallucinations compound across modules
- Blast radius of changes becomes invisible
- Production risk accumulates silently

ProdMind solves this with **persistent architectural memory** — a queryable graph of your project that remembers structure, risk, and intent across iterations.

## Core Features

### Project ZIP Ingestion
Upload complete project root ZIP files for instant analysis.

### AST-Based Structural Analysis
Extract symbols, imports, exports, interfaces, and architectural metadata without executing code.

### Persistent Graph Memory
Every project version becomes a queryable snapshot with deterministic node and edge relationships.

### Incremental Diff Analysis
Only changed files reprocessed between uploads — massive token and processing savings.

### Blast Radius Engine
Analyze architectural impact propagation using deterministic graph traversal.

### Production Risk Detection
Identify resilience, scalability, maintainability, and structural engineering risks.

### AI Prompt Generation
Generate highly structured prompts for external coding agents (Claude Code, Cursor, Antigravity).

### Local-First Design
No mandatory cloud dependency. Hybrid local/cloud AI inference ready.

## Architecture

**Tech Stack:**
- Turborepo monorepo + pnpm workspaces
- Vite + React frontend
- Hono backend
- Drizzle ORM + SQLite/libSQL
- Zod contract system
- TypeScript (strict mode everywhere)

**Core Systems:**
- Graph-based project memory engine
- AST parsing pipeline
- BFS dependency traversal engine
- Deterministic repository layer
- Transaction-safe persistence
- AI orchestration scaffolding
- Incremental snapshot architecture

## Engineering Principles

- No autonomous filesystem mutation
- No direct code execution of user projects
- Deterministic state transitions
- Strongly typed contracts
- Hallucination-resistant AI workflows
- Reproducible analysis pipelines

## Current Status

**Completed:**
- Monorepo foundation
- Workspace architecture
- Shared contracts system
- Database layer
- Graph schema & repository layer
- Traversal engine
- Snapshot lifecycle
- Transaction-safe persistence
- CI/CD foundation

**In Progress:**
- ZIP ingestion engine
- AST parsing pipeline
- AI orchestration layer
- Context compression engine
- Memory graph synthesis
- Production intelligence analysis

**Roadmap:**
- GitHub integration
- Semantic retrieval systems
- Architectural drift analysis
- Multi-language parsing
- Local LLM execution
- Production telemetry intelligence
- Organizational engineering policy systems

## Installation & Development

```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/prodmind.git
cd prodmind

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Dev server
pnpm run dev

# Run tests
pnpm run test
```

## Project Structure
prodmind/
├── packages/
│   ├── frontend/          # Vite + React UI
│   ├── backend/           # Hono server
│   ├── contracts/         # Zod schemas & types
│   ├── graph-engine/      # Project memory system
│   └── ...
├── turbo.json
├── pnpm-workspace.yaml
└── README.md

## Vision

ProdMind aims to become a **Staff Engineer AI Layer** for vibecoded software development — not replacing developers, but acting as a persistent architectural reviewer that prevents AI-generated projects from collapsing as complexity scales.

## Target Users

- Vibecoders & AI-first developers
- Indie hackers & startups
- Hackathon teams
- Senior engineers using AI augmentation
- Rapid prototyping teams
- Engineering reviewers

## License

[Add your license here — MIT, Apache 2.0, etc.]

## Contributing

Contributions welcome. Open an issue for discussion before large changes.
