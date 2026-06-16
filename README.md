# Meminspect

**Inspect your agent's memory** — diagnose and fix what Cursor and Claude Code actually remember.

Local-first and open source. No migration. No cloud required.

## What it does

Meminspect reads the memory your coding tools already store on disk — rules, auto-memory files, learned memories — and helps you understand what's wrong with it.

**Health Scan** — find contradictions, cross-project leakage, stale facts, redundant rules, and token bloat.

**Session Load Preview** — see what memory would load on your next session, with a token breakdown.

## Quickstart

```bash
git clone https://github.com/gate3/meminspect.git
cd meminspect
pnpm install
pnpm build
pnpm dev
```

- API: http://127.0.0.1:3847/health
- UI shell: http://127.0.0.1:5173

### Try the Claude Code adapter

```bash
curl "http://127.0.0.1:3847/projects/sources?path=$(pwd)"
curl "http://127.0.0.1:3847/tools"
```

### Try Health Scan (demo project)

In the UI, click **Try demo** in the header, then **Health Scan**. The demo project under `fixtures/health-scan-demo/` includes intentional errors (e.g. pnpm vs npm contradiction).

Or from the API:

```bash
DEMO=$(curl -s http://127.0.0.1:3847/demo/scan-project | jq -r .path)
curl -X POST "http://127.0.0.1:3847/projects/scan?path=$DEMO"
```

## Supported tools (v1)

- Cursor
- Claude Code

macOS first; Linux and Windows support planned.

## Docs

- [Architecture](./docs/ARCHITECTURE.md) — how the project is structured
- [Contributing](./CONTRIBUTING.md) — setup, standards, pull requests

## Monorepo packages

Internal workspace packages use the `@meminspect/*` scope (e.g. `@meminspect/core`). They are linked locally via pnpm `workspace:*` — not downloaded from npm. The `@contextlint/*` scope is used by a different project ([contextlint.dev](https://contextlint.dev/)); we intentionally use `@meminspect/*` to avoid collision.

## Security

Meminspect reads local agent memory, which may contain sensitive project details. The API binds to `127.0.0.1` only. Report security issues privately — do not open public GitHub issues for vulnerabilities.

## License

[MIT](./LICENSE)
