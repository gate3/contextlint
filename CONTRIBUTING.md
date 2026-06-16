# Contributing to Meminspect

Thanks for helping build Meminspect. Quality and safety matter — this tool reads real agent memory on developers' machines.

## Setup

```bash
pnpm install
pnpm dev
```

## Standards

Read `.cursor/rules/` before large changes:

- `project-standards.mdc` — architecture and safety
- `oss-quality.mdc` — merge bar
- `typescript.mdc`, `testing.mdc`, `security.mdc` — language-specific rules

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Tests

```bash
pnpm test
pnpm lint
pnpm typecheck
```

Every new scan rule and write-path change needs tests. Use synthetic fixtures only — never commit real user memory, rules, or `MEMORY.md` exports.

## Pull requests

1. Open a GitHub issue first for large changes (optional but appreciated)
2. Describe what changed and why
3. Confirm fixtures contain no real user memory
4. Keep PRs focused — one feature or fix at a time
5. Ensure CI passes

## Commits

Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`

## Security

Report vulnerabilities privately to the maintainer. Do not open public issues for sensitive findings.
