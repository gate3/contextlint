# Contextlint

**Lint your agent's context** — inspect, diagnose, and fix what Cursor and Claude Code actually remember.

Local-first and open source. No migration. No cloud required.

## What it does

Contextlint reads the memory your coding tools already store on disk — rules, auto-memory files, learned memories — and helps you understand what's wrong with it.

**Health Scan** — find contradictions, cross-project leakage, stale facts, redundant rules, and token bloat.

**Session Load Preview** — see what memory would load on your next session, with a token breakdown.

## Status

Early development. The monorepo scaffold is landing next.

## Quickstart

```bash
git clone https://github.com/gate3/contextlint.git
cd contextlint
pnpm install
pnpm dev
```

_(Available after the initial release.)_

## Supported tools (v1)

- Cursor
- Claude Code

macOS first; Linux and Windows support planned.

## Docs

- [Architecture](./docs/ARCHITECTURE.md) — how the project is structured
- [Contributing](./CONTRIBUTING.md) — setup, standards, pull requests

## Security

Contextlint reads local agent memory, which may contain sensitive project details. The API binds to `127.0.0.1` only. Report security issues privately — do not open public GitHub issues for vulnerabilities.

## License

[MIT](./LICENSE)
