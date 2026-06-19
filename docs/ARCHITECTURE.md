# Architecture

## Overview

Meminspect is a local dev tool with two main surfaces:

1. **API server** — discovers IDE memory on disk, runs scans, serves records
2. **Web UI** — browse memory, view scan results, preview session load

```
Browser UI  →  API server  →  Tool adapters  →  Local files / SQLite
                    ↓
              Scan engine + Session preview
```

## Monorepo layout

```
meminspect/
├── apps/
│   ├── server/          # Hono API + CLI
│   │   ├── src/routes/  # Thin route handlers by domain
│   │   └── src/services/ # Record loading, scan preferences
│   └── web/             # Vite + React UI
│       ├── src/services/  # HTTP client + API calls (no fetch in components)
│       ├── src/hooks/       # Container logic (state, side effects)
│       └── src/components/  # Presentational UI; feature folders (e.g. memory-browser/)
├── packages/
│   ├── core/            # Types, scan engine, preview, WriteGuard
│   ├── adapter-cursor/
│   └── adapter-claude-code/
└── docs/
```

## Stack

TypeScript, Node 22+, Hono, Vite, React, Tailwind, Vitest, ESLint, Prettier.

## Design rules

1. **Adapters own tool paths** — Cursor and Claude Code parsing stays in `packages/adapter-*`; core is tool-agnostic
2. **All writes go through WriteGuard** — backup before every mutation; single-step undo
3. **Cursor SQLite is read-only by default** — markdown files are the safe edit path
4. **Localhost only** — API binds to `127.0.0.1`; no telemetry in OSS core
5. **Never log memory content** — user rules and memory files may contain secrets

## Adapter interface

Each tool adapter implements discovery, listing sources, reading records, and optional writes. All adapters return normalized `MemoryRecord` objects so the scan engine and UI stay tool-agnostic.

## Health Scan

Deterministic rules (no LLM in v1): contradictions, cross-project leakage, stale dependencies vs `package.json`, redundant rules, over-broad rules, token budget estimates.

## Session Load

`packages/core/src/preview/` inventories on-disk memory in IDE load order with per-file token estimates (chars ÷ 4). Session-load sources exclude SQLite KV and MCP config. The UI expands each layer to list contributing files (with `alwaysApply` / globs for rules); click a file to open record detail. Scan findings whose `recordIds` intersect session-load records are attached as **conflicts**.

| Layer (Cursor) | Sources |
|----------------|---------|
| Project rules | `cursor-rules` |
| Learned memories | `cursor-learned` |

| Layer (Claude Code) | Sources |
|---------------------|---------|
| User CLAUDE.md | `claude-user` |
| Parent CLAUDE.md | `claude-md-parent` |
| Project CLAUDE.md | `claude-md`, `claude-md-local` |
| Auto memory | `claude-auto-memory`, `claude-auto-memory-topic` |

## Write Guard

`packages/core/src/write-guard/` handles all memory mutations:

1. Refuse read-only records and SQLite KV (KV edits require adapter-level support, not file writes)
2. Backup existing files to `~/.meminspect/backups/<timestamp>/` via `fs.copyFile`
3. Atomic write to target file (follows symlinks to the real path when the file already exists)
4. Store single-step undo in `~/.meminspect/undo.json`; undo removes the backup artifact after restore

## API (M1)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness |
| GET | `/tools` | Detect installed adapters |
| GET | `/projects` | List discovered projects (adapters + `~/.meminspect/config.json`) |
| GET | `/projects/sources?path=` | List memory sources (`tool` optional) |
| GET | `/projects/records?path=` | List all memory records (`tool` optional) |
| GET | `/records?path=&id=` | Read a single record |
| GET | `/search?path=&q=` | Search memory content (`tool` optional) |
| POST | `/projects/scan?path=` | Run health scan (`tool` optional) |
| GET | `/projects/scan/preferences?path=` | Snooze / disabled-rule preferences |
| POST | `/projects/scan/snooze` | Snooze a finding (`{ path, findingId }`) |
| POST | `/projects/scan/disable-rule` | Disable or enable a rule (`{ path, ruleId, enabled? }`) |
| GET | `/projects/preview?path=` | Session load preview + attached scan conflicts (`tool` optional) |
| PUT | `/records?path=&id=` | Update record content via WriteGuard (`{ content }` body) |
| GET | `/undo` | Undo availability for last write |
| POST | `/undo` | Restore last write from backup |

Server binds to `127.0.0.1:3847` by default. User overrides live in `~/.meminspect/config.json`.

## Memory source types (UI labels)

| Internal kind | What it is |
|---------------|------------|
| `cursor-rules` | `.cursor/rules/*.mdc` project rules |
| `cursor-learned` | `.cursor/learned_memories.mdc` |
| `cursor-sqlite-kv` | Read-only keys from Cursor `state.vscdb` (`ItemTable` / `cursorDiskKV`). Internal app state — memory, composer context — **not** full chat history. UI shows **Cursor global DB** vs **Cursor workspace DB**. |

## Adding a feature

1. Types in `packages/core`
2. Adapter changes in `packages/adapter-*` with fixture tests
3. API route in `apps/server`
4. UI in `apps/web`
5. Tests for scan rules and any write path
